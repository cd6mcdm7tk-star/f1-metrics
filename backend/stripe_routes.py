from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import stripe
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Configuration Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@router.post("/create-checkout-session")
async def create_checkout_session(request: Request):
    try:
        body = await request.json()
        user_id = body.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        # Créer la session Stripe Checkout
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': STRIPE_PRICE_ID,
                'quantity': 1,
            }],
            mode='subscription',
            success_url='https://metrikdelta.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://metrikdelta.com/cancel',
            client_reference_id=user_id,
            metadata={
                'user_id': user_id
            }
        )
        
        return JSONResponse(content={
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id
        })
        
    except Exception as e:
        print(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        
        if user_id:
            # Créer ou mettre à jour l'abonnement dans Supabase
            supabase.table('subscriptions').upsert({
                'user_id': user_id,
                'stripe_customer_id': customer_id,
                'stripe_subscription_id': subscription_id,
                'status': 'active',
                'plan': 'metrik_plus'
            }).execute()
            
            print(f"✅ Subscription activated for user {user_id}")
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        subscription_id = subscription['id']
        
        # Désactiver l'abonnement dans Supabase
        supabase.table('subscriptions').update({
            'status': 'cancelled'
        }).eq('stripe_subscription_id', subscription_id).execute()
        
        print(f"❌ Subscription cancelled: {subscription_id}")
    
    return JSONResponse(content={"status": "success"})
