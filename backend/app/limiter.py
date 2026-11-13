from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def client_ip(request: Request) -> str:
    """The visitor's address. Railway's proxy is the one connecting to the app, so
    its address would put every visitor in one bucket: the last entry of
    X-Forwarded-For, the one the proxy added, is the visitor's."""
    forwarded = request.headers.get("x-forwarded-for", "")
    hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
    return hops[-1] if hops else get_remote_address(request)


limiter = Limiter(key_func=client_ip)
