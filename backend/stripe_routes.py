from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
import stripe
import os
import jwt
from supabase import create_client
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

router = APIRouter()
security = HTTPBearer()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def get_authenticated_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Valide le JWT Supabase et retourne le user_id."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# Configuration Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PRICE_ID_MONTHLY = os.getenv("STRIPE_PRICE_ID_MONTHLY")
STRIPE_PRICE_ID_ANNUAL = os.getenv("STRIPE_PRICE_ID_ANNUAL")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


@router.post("/create-checkout-session")
async def create_checkout_session(request: Request):
    """
    Créer une session Stripe Checkout pour un utilisateur
    Supporte Monthly (1,99€/mois) et Annual (14,99€/an)
    """
    try:
        body = await request.json()
        user_id = body.get("user_id")
        plan_type = body.get("plan_type", "annual")  # 'monthly' ou 'annual'

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")

        # Sélectionner le bon PRICE_ID selon le plan choisi
        if plan_type == "monthly":
            price_id = STRIPE_PRICE_ID_MONTHLY
            plan_name = "metrik_pro_monthly"
        elif plan_type == "annual":
            price_id = STRIPE_PRICE_ID_ANNUAL
            plan_name = "metrik_pro_annual"
        else:
            raise HTTPException(status_code=400, detail="Invalid plan_type. Use 'monthly' or 'annual'")

        if not price_id:
            raise HTTPException(status_code=500, detail=f"STRIPE_PRICE_ID_{plan_type.upper()} not configured")

        logger.info(f"📦 Creating checkout session for user: {user_id}")
        logger.info(f"   Plan: {plan_type} ({plan_name})")
        logger.info(f"   Price ID: {price_id}")

        # Créer la session Stripe Checkout
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url='https://metrikdelta.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://metrikdelta.com/cancel',
            client_reference_id=user_id,
            metadata={
                'user_id': user_id,
                'plan_type': plan_type
            }
        )

        logger.info(f"✅ Checkout session created: {checkout_session.id}")

        return JSONResponse(content={
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id
        })

    except Exception as e:
        logger.error(f"❌ Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook Stripe : reçoit les événements de Stripe et met à jour Supabase
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    # Vérifier la signature du webhook
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"❌ Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"❌ Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    logger.info(f"🔔 Webhook received: {event['type']}")

    # ✅ ÉVÉNEMENT : Paiement réussi (nouveau abonnement)
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        plan_type = session.get('metadata', {}).get('plan_type', 'unknown')

        logger.info(f"💳 Payment completed:")
        logger.info(f"   User ID: {user_id}")
        logger.info(f"   Customer: {customer_id}")
        logger.info(f"   Subscription: {subscription_id}")
        logger.info(f"   Plan Type: {plan_type}")

        if user_id:
            try:
                # Déterminer le plan name
                if plan_type == "monthly":
                    plan_name = "metrik_pro_monthly"
                elif plan_type == "annual":
                    plan_name = "metrik_pro_annual"
                else:
                    plan_name = "metrik_pro"

                # Créer ou mettre à jour l'abonnement dans Supabase
                result = supabase.table('subscriptions').upsert({
                    'user_id': user_id,
                    'stripe_customer_id': customer_id,
                    'stripe_subscription_id': subscription_id,
                    'status': 'active',
                    'plan': plan_name
                }).execute()

                logger.info(f"✅ Subscription activated in Supabase for user {user_id}")
                logger.info(f"   Plan: {plan_name}")
                
            except Exception as e:
                logger.error(f"❌ Error updating Supabase: {e}")
        else:
            logger.info(f"⚠️ No user_id found in checkout session")

    # ✅ ÉVÉNEMENT : Abonnement mis à jour (renouvellement, changement de carte)
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        subscription_id = subscription['id']
        status = subscription['status']  # active, past_due, canceled, etc.

        logger.info(f"🔄 Subscription updated: {subscription_id} → {status}")

        try:
            # Mettre à jour le statut dans Supabase
            result = supabase.table('subscriptions').update({
                'status': status
            }).eq('stripe_subscription_id', subscription_id).execute()

            logger.info(f"✅ Status updated in Supabase")
            
        except Exception as e:
            logger.error(f"❌ Error updating Supabase: {e}")

    # ❌ ÉVÉNEMENT : Abonnement annulé
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        subscription_id = subscription['id']

        logger.error(f"❌ Subscription cancelled: {subscription_id}")

        try:
            # Désactiver l'abonnement dans Supabase
            result = supabase.table('subscriptions').update({
                'status': 'cancelled'
            }).eq('stripe_subscription_id', subscription_id).execute()

            logger.info(f"✅ Subscription cancelled in Supabase")
            
        except Exception as e:
            logger.error(f"❌ Error updating Supabase: {e}")

    return JSONResponse(content={"status": "success"})


@router.get("/check-subscription/{user_id}")
async def check_subscription(user_id: str, token_user_id: str = Depends(get_authenticated_user_id)):
    """
    Vérifier si un utilisateur a un abonnement PRO actif
    """
    if token_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
    try:
        result = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
        
        if result.data and len(result.data) > 0:
            subscription = result.data[0]
            is_active = subscription.get('status') in ('active', 'trialing')
            
            return {
                "has_subscription": is_active,
                "subscription": subscription,
                "plan": subscription.get('plan'),
                "status": subscription.get('status')
            }
        else:
            return {
                "has_subscription": False,
                "subscription": None,
                "plan": None,
                "status": None
            }
    except Exception as e:
        logger.error(f"❌ Error checking subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer-portal/{user_id}")
async def create_customer_portal_session(user_id: str, token_user_id: str = Depends(get_authenticated_user_id)):
    """
    Créer une session Customer Portal pour gérer l'abonnement
    (annuler, changer de carte, télécharger factures)
    """
    if token_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
    try:
        # Récupérer le customer_id depuis Supabase
        result = supabase.table('subscriptions').select('stripe_customer_id').eq('user_id', user_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        customer_id = result.data[0].get('stripe_customer_id')
        
        if not customer_id:
            raise HTTPException(status_code=404, detail="No Stripe customer ID found")

        # Créer la session Customer Portal
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url='https://metrikdelta.com/account',
        )

        return JSONResponse(content={
            "portal_url": portal_session.url
        })

    except Exception as e:
        logger.error(f"❌ Error creating customer portal session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


