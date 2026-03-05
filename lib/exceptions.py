"""Custom exception hierarchy for StockPulse application."""


class StockPulseError(Exception):
    """Base exception for StockPulse application."""
    status_code = 500

    def __init__(self, message=None):
        super().__init__(message or self.__class__.__name__)
        self.message = message or "An internal error occurred"


class TickerNotFoundError(StockPulseError):
    status_code = 404

    def __init__(self, ticker=None):
        msg = f"Ticker '{ticker}' not found" if ticker else "Ticker not found"
        super().__init__(msg)


class ValidationError(StockPulseError):
    status_code = 400

    def __init__(self, message="Invalid request"):
        super().__init__(message)


class InsufficientDataError(StockPulseError):
    status_code = 422

    def __init__(self, message="Insufficient data for analysis"):
        super().__init__(message)


class AuthenticationError(StockPulseError):
    status_code = 401

    def __init__(self, message="Authentication required"):
        super().__init__(message)
