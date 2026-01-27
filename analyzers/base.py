"""
Base Analyzer - Abstract base class for all analysis layers
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class BaseAnalyzer(ABC):
    """
    Abstract base class for all analyzers in the 5-layer system.

    Each analyzer should:
    1. Accept standardized inputs (ticker, data dict)
    2. Return a standardized result dataclass
    3. Handle errors gracefully with fallback behavior
    4. Log analysis steps for debugging
    """

    def __init__(self, cache: Optional[Any] = None):
        """
        Initialize analyzer with optional cache instance.

        Args:
            cache: TickerCache instance for data caching
        """
        self.cache = cache
        self.logger = logging.getLogger(self.__class__.__name__)

    @abstractmethod
    def analyze(self, ticker: str, data: Dict[str, Any]) -> Any:
        """
        Perform analysis on the given ticker.

        Args:
            ticker: Stock ticker symbol (e.g., 'AAPL')
            data: Dictionary containing all fetched data for the ticker
                  (history, info, financials, news, etc.)

        Returns:
            Layer-specific result dataclass
        """
        pass

    @property
    @abstractmethod
    def layer_name(self) -> str:
        """Return the name of this analysis layer."""
        pass

    @property
    @abstractmethod
    def layer_number(self) -> int:
        """Return the layer number (1-5)."""
        pass

    def _safe_get(self, data: Dict, *keys, default=None):
        """
        Safely get nested dictionary values.

        Args:
            data: Dictionary to traverse
            keys: Sequence of keys to follow
            default: Default value if key not found

        Returns:
            Value at the nested key path, or default
        """
        current = data
        for key in keys:
            if isinstance(current, dict):
                current = current.get(key, default)
            else:
                return default
            if current is None:
                return default
        return current

    def _log_analysis(self, ticker: str, result: Any):
        """Log analysis completion with key metrics."""
        self.logger.info(
            f"[{self.layer_name}] {ticker}: Analysis complete - {result}"
        )

    def _handle_error(self, ticker: str, error: Exception, fallback_result: Any) -> Any:
        """
        Handle analysis errors gracefully.

        Args:
            ticker: Stock ticker being analyzed
            error: Exception that occurred
            fallback_result: Result to return on error

        Returns:
            Fallback result with error noted
        """
        self.logger.error(
            f"[{self.layer_name}] {ticker}: Error - {str(error)}",
            exc_info=True
        )
        return fallback_result
