"""
Layer 2: Intrinsic Value Analyzer

Multi-method valuation analysis:
- DCF (Discounted Cash Flow)
- Owner Earnings (Buffett method)
- Peer Relative (sector comparison)
- Reverse DCF (what's priced in)
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List
import logging

from analyzers.base import BaseAnalyzer
from models.results import IntrinsicValueResult, ValuationMethod
from utils.constants import RISK_FREE_RATE, MARKET_RISK_PREMIUM, SECTOR_TICKERS

logger = logging.getLogger(__name__)


class IntrinsicValueAnalyzer(BaseAnalyzer):
    """
    Layer 2: Intrinsic Value - Multi-method valuation analysis.

    Calculates fair value using multiple approaches and triangulates
    to produce a range estimate with confidence scoring.
    """

    # Valuation parameters
    TERMINAL_GROWTH_RATE = 0.025  # 2.5% perpetual growth
    PROJECTION_YEARS = 5
    MIN_DISCOUNT_RATE = 0.08
    MAX_DISCOUNT_RATE = 0.15

    @property
    def layer_name(self) -> str:
        return "Intrinsic Value"

    @property
    def layer_number(self) -> int:
        return 2

    def analyze(self, ticker: str, data: Dict[str, Any]) -> IntrinsicValueResult:
        """
        Perform intrinsic value analysis using multiple methods.

        Args:
            ticker: Stock ticker symbol
            data: Dict containing 'info', 'financials', 'history'

        Returns:
            IntrinsicValueResult with fair value estimates
        """
        info = data.get('info', {})
        financials = data.get('financials', {})
        history = data.get('history')
        current_price = data.get('current_price', 0)

        if not current_price and info:
            current_price = info.get('currentPrice') or info.get('regularMarketPrice', 0)

        methods_used: List[ValuationMethod] = []
        fair_values: List[float] = []

        # Method 1: DCF Valuation
        dcf_result = self._dcf_valuation(info, financials)
        if dcf_result:
            methods_used.append(dcf_result)
            if dcf_result.fair_value:
                fair_values.append(dcf_result.fair_value)

        # Method 2: Owner Earnings (Buffett)
        owner_result = self._owner_earnings_valuation(info, financials)
        if owner_result:
            methods_used.append(owner_result)
            if owner_result.fair_value:
                fair_values.append(owner_result.fair_value)

        # Method 3: Peer Relative Valuation
        peer_result = self._peer_relative_valuation(ticker, info)
        if peer_result:
            methods_used.append(peer_result)
            if peer_result.fair_value:
                fair_values.append(peer_result.fair_value)

        # Method 4: Reverse DCF (what growth is priced in)
        implied_growth = self._reverse_dcf(info, financials, current_price)

        # Calculate fair value range
        if fair_values:
            fair_value_low = min(fair_values)
            fair_value_high = max(fair_values)
            fair_value_mid = np.median(fair_values)
        else:
            # Fallback to analyst targets if available
            fair_value_mid = info.get('targetMeanPrice', current_price)
            fair_value_low = info.get('targetLowPrice', current_price * 0.8)
            fair_value_high = info.get('targetHighPrice', current_price * 1.2)

        # Calculate margin of safety
        if fair_value_mid and fair_value_mid > 0:
            margin_of_safety = (fair_value_mid - current_price) / fair_value_mid
        else:
            margin_of_safety = 0

        # Determine valuation signal
        if margin_of_safety > 0.25:
            valuation_signal = 'UNDERVALUED'
        elif margin_of_safety > 0.10:
            valuation_signal = 'SLIGHTLY_UNDERVALUED'
        elif margin_of_safety > -0.10:
            valuation_signal = 'FAIRLY_VALUED'
        elif margin_of_safety > -0.25:
            valuation_signal = 'SLIGHTLY_OVERVALUED'
        else:
            valuation_signal = 'OVERVALUED'

        # Calculate conviction based on method agreement
        conviction = self._calculate_conviction(fair_values, current_price)

        result = IntrinsicValueResult(
            fair_value_low=fair_value_low,
            fair_value_mid=fair_value_mid,
            fair_value_high=fair_value_high,
            current_price=current_price,
            margin_of_safety=margin_of_safety,
            valuation_signal=valuation_signal,
            methods_used=methods_used,
            conviction=conviction,
            implied_growth_rate=implied_growth
        )

        self._log_analysis(
            ticker,
            f"signal={valuation_signal}, MoS={margin_of_safety:.1%}, methods={len(methods_used)}"
        )
        return result

    def _dcf_valuation(
        self, info: Dict, financials: Dict
    ) -> Optional[ValuationMethod]:
        """
        DCF (Discounted Cash Flow) valuation.

        Projects free cash flow for 5 years + terminal value,
        discounted at WACC.
        """
        try:
            # Get Free Cash Flow
            fcf = info.get('freeCashflow')
            if not fcf or fcf <= 0:
                # Try to calculate from financials
                cashflow = financials.get('quarterly_cashflow')
                if cashflow is not None and not cashflow.empty:
                    cfo = self._safe_get_df_value(cashflow, ['Operating Cash Flow', 'Total Cash From Operating Activities'])
                    capex = self._safe_get_df_value(cashflow, ['Capital Expenditure', 'Capital Expenditures'])
                    if cfo and capex:
                        fcf = cfo - abs(capex)
                        fcf = fcf * 4  # Annualize quarterly

            if not fcf or fcf <= 0:
                return ValuationMethod(
                    method_name='DCF',
                    fair_value=None,
                    confidence=0,
                    notes='Insufficient FCF data'
                )

            # Get growth rate
            growth_rate = info.get('revenueGrowth') or info.get('earningsGrowth') or 0.05
            growth_rate = min(max(growth_rate, 0), 0.20)  # Cap at 20%

            # Calculate discount rate (WACC approximation)
            beta = info.get('beta', 1.0)
            if beta is None or beta < 0:
                beta = 1.0
            discount_rate = RISK_FREE_RATE + (beta * MARKET_RISK_PREMIUM)
            discount_rate = max(self.MIN_DISCOUNT_RATE, min(discount_rate, self.MAX_DISCOUNT_RATE))

            # Project FCF for 5 years
            projected_fcf = []
            current_fcf = fcf
            for year in range(1, self.PROJECTION_YEARS + 1):
                # Growth rate decays toward terminal rate
                year_growth = growth_rate * (1 - year / (self.PROJECTION_YEARS * 2))
                year_growth = max(year_growth, self.TERMINAL_GROWTH_RATE)
                current_fcf = current_fcf * (1 + year_growth)
                pv_factor = 1 / ((1 + discount_rate) ** year)
                projected_fcf.append(current_fcf * pv_factor)

            # Terminal value
            terminal_fcf = current_fcf * (1 + self.TERMINAL_GROWTH_RATE)
            terminal_value = terminal_fcf / (discount_rate - self.TERMINAL_GROWTH_RATE)
            terminal_pv = terminal_value / ((1 + discount_rate) ** self.PROJECTION_YEARS)

            # Enterprise value
            enterprise_value = sum(projected_fcf) + terminal_pv

            # Equity value
            total_debt = info.get('totalDebt', 0) or 0
            cash = info.get('totalCash', 0) or 0
            equity_value = enterprise_value - total_debt + cash

            # Per share value
            shares = info.get('sharesOutstanding', 1)
            if not shares or shares <= 0:
                shares = info.get('impliedSharesOutstanding', 1) or 1

            fair_value = equity_value / shares

            return ValuationMethod(
                method_name='DCF',
                fair_value=fair_value if fair_value > 0 else None,
                confidence=0.7 if fcf > 0 else 0.3,
                inputs_used={
                    'fcf': fcf,
                    'growth_rate': growth_rate,
                    'discount_rate': discount_rate,
                    'beta': beta
                },
                notes=f'5-year DCF with {discount_rate:.1%} discount rate'
            )

        except Exception as e:
            logger.debug(f"DCF valuation failed: {e}")
            return ValuationMethod(
                method_name='DCF',
                fair_value=None,
                confidence=0,
                notes=f'Calculation error: {str(e)}'
            )

    def _owner_earnings_valuation(
        self, info: Dict, financials: Dict
    ) -> Optional[ValuationMethod]:
        """
        Owner Earnings valuation (Buffett method).

        Owner Earnings = Net Income + Depreciation - Maintenance CapEx
        """
        try:
            # Get components
            net_income = info.get('netIncomeToCommon')
            depreciation = info.get('depreciation')

            if not net_income:
                income_stmt = financials.get('quarterly_income_stmt')
                if income_stmt is not None and not income_stmt.empty:
                    net_income = self._safe_get_df_value(income_stmt, ['Net Income'])
                    if net_income:
                        net_income = net_income * 4  # Annualize

            if not depreciation:
                cashflow = financials.get('quarterly_cashflow')
                if cashflow is not None and not cashflow.empty:
                    depreciation = self._safe_get_df_value(cashflow, ['Depreciation And Amortization', 'Depreciation'])
                    if depreciation:
                        depreciation = abs(depreciation) * 4  # Annualize

            if not net_income:
                return ValuationMethod(
                    method_name='Owner_Earnings',
                    fair_value=None,
                    confidence=0,
                    notes='Insufficient earnings data'
                )

            # Estimate maintenance capex (assume 70% of total capex)
            capex = info.get('capitalExpenditures') or 0
            if not capex:
                cashflow = financials.get('quarterly_cashflow')
                if cashflow is not None and not cashflow.empty:
                    capex = self._safe_get_df_value(cashflow, ['Capital Expenditure', 'Capital Expenditures'])
                    if capex:
                        capex = abs(capex) * 4

            maintenance_capex = abs(capex) * 0.7 if capex else 0

            # Calculate owner earnings
            owner_earnings = net_income + (depreciation or 0) - maintenance_capex

            if owner_earnings <= 0:
                return ValuationMethod(
                    method_name='Owner_Earnings',
                    fair_value=None,
                    confidence=0,
                    notes='Negative owner earnings'
                )

            # Apply multiple based on growth
            growth_rate = info.get('revenueGrowth') or 0.05
            if growth_rate > 0.15:
                multiple = 18
            elif growth_rate > 0.10:
                multiple = 15
            elif growth_rate > 0.05:
                multiple = 12
            else:
                multiple = 10

            enterprise_value = owner_earnings * multiple

            # Adjust for debt and cash
            total_debt = info.get('totalDebt', 0) or 0
            cash = info.get('totalCash', 0) or 0
            equity_value = enterprise_value - total_debt + cash

            # Per share
            shares = info.get('sharesOutstanding', 1) or 1
            fair_value = equity_value / shares

            return ValuationMethod(
                method_name='Owner_Earnings',
                fair_value=fair_value if fair_value > 0 else None,
                confidence=0.6,
                inputs_used={
                    'net_income': net_income,
                    'depreciation': depreciation,
                    'maintenance_capex': maintenance_capex,
                    'multiple': multiple
                },
                notes=f'Owner earnings x {multiple} multiple'
            )

        except Exception as e:
            logger.debug(f"Owner earnings valuation failed: {e}")
            return ValuationMethod(
                method_name='Owner_Earnings',
                fair_value=None,
                confidence=0,
                notes=f'Calculation error: {str(e)}'
            )

    def _peer_relative_valuation(
        self, ticker: str, info: Dict
    ) -> Optional[ValuationMethod]:
        """
        Peer Relative valuation using sector multiples.
        """
        try:
            # Get company metrics
            pe_ratio = info.get('trailingPE')
            ev_ebitda = info.get('enterpriseToEbitda')
            ps_ratio = info.get('priceToSalesTrailing12Months')
            current_price = info.get('currentPrice') or info.get('regularMarketPrice', 0)

            if not current_price:
                return None

            # Get sector
            sector = info.get('sector', '').lower()

            # Sector median multiples (approximations)
            SECTOR_MULTIPLES = {
                'technology': {'pe': 25, 'ev_ebitda': 15, 'ps': 5},
                'healthcare': {'pe': 22, 'ev_ebitda': 14, 'ps': 4},
                'financial services': {'pe': 12, 'ev_ebitda': 10, 'ps': 3},
                'consumer cyclical': {'pe': 18, 'ev_ebitda': 12, 'ps': 1.5},
                'industrials': {'pe': 18, 'ev_ebitda': 11, 'ps': 1.5},
                'energy': {'pe': 12, 'ev_ebitda': 6, 'ps': 1},
                'utilities': {'pe': 16, 'ev_ebitda': 10, 'ps': 2},
                'default': {'pe': 18, 'ev_ebitda': 12, 'ps': 2}
            }

            multiples = SECTOR_MULTIPLES.get(sector, SECTOR_MULTIPLES['default'])

            fair_values = []

            # P/E based valuation
            if pe_ratio and pe_ratio > 0:
                eps = current_price / pe_ratio
                pe_fair_value = eps * multiples['pe']
                fair_values.append(pe_fair_value)

            # EV/EBITDA based (approximation)
            if ev_ebitda and ev_ebitda > 0:
                ev = info.get('enterpriseValue', 0)
                if ev:
                    ebitda = ev / ev_ebitda
                    target_ev = ebitda * multiples['ev_ebitda']
                    # Simple conversion to equity value
                    debt = info.get('totalDebt', 0) or 0
                    cash = info.get('totalCash', 0) or 0
                    shares = info.get('sharesOutstanding', 1) or 1
                    ev_fair_value = (target_ev - debt + cash) / shares
                    if ev_fair_value > 0:
                        fair_values.append(ev_fair_value)

            if not fair_values:
                return ValuationMethod(
                    method_name='Peer_Relative',
                    fair_value=None,
                    confidence=0,
                    notes='Insufficient multiple data'
                )

            fair_value = np.median(fair_values)

            return ValuationMethod(
                method_name='Peer_Relative',
                fair_value=fair_value,
                confidence=0.5,
                inputs_used={
                    'sector': sector,
                    'target_pe': multiples['pe'],
                    'target_ev_ebitda': multiples['ev_ebitda']
                },
                notes=f'Based on {sector} sector multiples'
            )

        except Exception as e:
            logger.debug(f"Peer relative valuation failed: {e}")
            return None

    def _reverse_dcf(
        self, info: Dict, financials: Dict, current_price: float
    ) -> Optional[float]:
        """
        Reverse DCF - calculate what growth rate is implied by current price.
        """
        try:
            fcf = info.get('freeCashflow')
            shares = info.get('sharesOutstanding', 1) or 1
            market_cap = current_price * shares

            if not fcf or fcf <= 0 or not market_cap:
                return None

            # Binary search for implied growth rate
            beta = info.get('beta', 1.0) or 1.0
            discount_rate = RISK_FREE_RATE + (beta * MARKET_RISK_PREMIUM)
            discount_rate = max(0.08, min(discount_rate, 0.15))

            def calculate_dcf_value(growth_rate: float) -> float:
                total_pv = 0
                current_fcf = fcf
                for year in range(1, 6):
                    current_fcf = current_fcf * (1 + growth_rate)
                    pv = current_fcf / ((1 + discount_rate) ** year)
                    total_pv += pv

                # Terminal value
                terminal_fcf = current_fcf * (1 + 0.025)
                terminal_value = terminal_fcf / (discount_rate - 0.025)
                terminal_pv = terminal_value / ((1 + discount_rate) ** 5)

                return total_pv + terminal_pv

            # Search for growth rate that matches market cap
            low, high = -0.10, 0.50
            for _ in range(20):  # Binary search iterations
                mid = (low + high) / 2
                dcf_value = calculate_dcf_value(mid)

                if abs(dcf_value - market_cap) / market_cap < 0.01:
                    return mid
                elif dcf_value < market_cap:
                    low = mid
                else:
                    high = mid

            return (low + high) / 2

        except Exception as e:
            logger.debug(f"Reverse DCF failed: {e}")
            return None

    def _calculate_conviction(
        self, fair_values: List[float], current_price: float
    ) -> float:
        """Calculate conviction based on method agreement."""
        if not fair_values or len(fair_values) < 2:
            return 0.3

        # Calculate coefficient of variation
        mean_fv = np.mean(fair_values)
        std_fv = np.std(fair_values)

        if mean_fv == 0:
            return 0.3

        cv = std_fv / mean_fv

        # Lower CV = higher agreement = higher conviction
        if cv < 0.10:
            conviction = 0.9
        elif cv < 0.20:
            conviction = 0.75
        elif cv < 0.30:
            conviction = 0.6
        elif cv < 0.40:
            conviction = 0.45
        else:
            conviction = 0.3

        # Bonus if all methods agree on direction vs current price
        all_above = all(fv > current_price for fv in fair_values)
        all_below = all(fv < current_price for fv in fair_values)
        if all_above or all_below:
            conviction = min(conviction + 0.1, 0.95)

        return conviction

    def _safe_get_df_value(
        self, df: pd.DataFrame, keys: List[str]
    ) -> Optional[float]:
        """Safely get value from DataFrame."""
        if df is None or df.empty:
            return None
        for key in keys:
            if key in df.index:
                val = df.loc[key].iloc[0]
                if pd.notna(val):
                    return float(val)
        return None
