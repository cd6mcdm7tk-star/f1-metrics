import logging

from fastapi import HTTPException

logger = logging.getLogger(__name__)


def fastf1_http_error(e: Exception, context: str = "") -> HTTPException:
    """Turns a FastF1 / data-source failure into an HTTP error with a clear message."""
    message = str(e).lower()

    if "session" in message and ("not found" in message or "does not exist" in message):
        return HTTPException(status_code=404, detail={
            "error": "Session not found",
            "message": f"This session doesn't exist for this event. {context}",
            "suggestion": "Check the year, Grand Prix and session type.",
        })

    if "no data" in message or "empty" in message:
        return HTTPException(status_code=404, detail={
            "error": "Data not available",
            "message": f"No data is available for this request. {context}",
            "suggestion": "The session may not have taken place yet, or its data isn't published.",
        })

    if "driver" in message and "not found" in message:
        return HTTPException(status_code=404, detail={
            "error": "Driver not found",
            "message": f"This driver didn't take part in this session. {context}",
            "suggestion": "Check the driver code (e.g. VER, HAM, LEC).",
        })

    if "connection" in message or "timeout" in message or "network" in message:
        return HTTPException(status_code=503, detail={
            "error": "Connection error",
            "message": "Couldn't reach the data source.",
            "suggestion": "Try again in a few moments.",
        })

    logger.exception(f"Unhandled error ({context}): {e}")
    return HTTPException(status_code=500, detail={
        "error": "Server error",
        "message": f"Something went wrong while processing this request. {context}",
        "suggestion": "Contact support if the problem persists.",
        "technical_details": str(e),
    })
