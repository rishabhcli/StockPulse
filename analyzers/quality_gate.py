"""
Layer 1: Quality Gate Analyzer

Binary pass/fail filter for companies with structural problems:
- Accounting quality issues
- Financial distress indicators
- Governance red flags

If a company fails the quality gate, the final score is capped
and a warning is shown to the user.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List
import logging

from analyzers.base import BaseAnalyzer
from models.results import (
    QualityGateResult,
    QualityFlag,
    QualityFlagType
)

logger = logging.getLogger(__name__)


class QualityGateAnalyzer(BaseAnalyzer):
    """
    Layer 1: Quality Gate - Pass/Fail filter for company quality.

    Checks:
    1. Accounting Quality: CFO vs Net Income, receivables growth, inventory
    2. Financial Health: Altman Z-Score, current ratio, interest coverage
    3. Debt Load: Debt/EBITDA ratio
    4. Governance: Insider activity patterns (when available)
    """

    @property
    def layer_name(self) -> str:
        return "Quality Gate"

    @property
    def layer_number(self) -> int:
        return 1

    def analyze(self, ticker: str, data: Dict[str, Any]) -> QualityGateResult:
        """
        Perform quality gate analysis.

        Args:
            ticker: Stock ticker symbol
            data: Dict containing 'info', 'financials', 'holders'

        Returns:
            QualityGateResult with pass/fail and any flags
        """
        flags: List[QualityFlag] = []
        metrics = {}

        info = data.get('info', {})
        financials = data.get('financials', {})
        holders = data.get('holders', {})

        # Check if we have enough data
        has_financials = financials.get('data_available', False)

        if not has_financials and not info:
            return QualityGateResult(
                passed=None,
                flags=[],
                confidence=0.2,
                data_quality='insufficient',
                status='unknown',
                reason='Financial statements unavailable',
            )

        # ============== Accounting Quality Checks ==============

        # Check 1: Cash Flow Quality (CFO vs Net Income)
        cfq = self._check_cash_flow_quality(financials, info)
        if cfq:
            metrics['cash_flow_quality'] = cfq['ratio']
            if cfq['flag']:
                flags.append(cfq['flag'])

        # Check 2: Receivables Growth vs Revenue Growth
        ar_flag = self._check_receivables_growth(financials)
        if ar_flag:
            flags.append(ar_flag)

        # Check 3: Inventory Buildup
        inv_flag = self._check_inventory_buildup(financials)
        if inv_flag:
            flags.append(inv_flag)

        # ============== Financial Health Checks ==============

        # Check 4: Altman Z-Score
        z_score = self._calculate_altman_z(financials, info)
        if z_score is not None:
            metrics['altman_z_score'] = z_score
            if z_score < 1.8:
                flags.append(QualityFlag(
                    flag_type=QualityFlagType.SOLVENCY,
                    severity='critical',
                    metric_name='Altman Z-Score',
                    metric_value=z_score,
                    threshold=1.8,
                    description=f'Z-Score of {z_score:.2f} indicates high bankruptcy risk (distress zone < 1.8)'
                ))
            elif z_score < 2.7:
                flags.append(QualityFlag(
                    flag_type=QualityFlagType.SOLVENCY,
                    severity='warning',
                    metric_name='Altman Z-Score',
                    metric_value=z_score,
                    threshold=2.7,
                    description=f'Z-Score of {z_score:.2f} is in grey zone (1.8-2.7), moderate risk'
                ))

        # Check 5: Current Ratio
        current_ratio = self._calculate_current_ratio(financials, info)
        if current_ratio is not None:
            metrics['current_ratio'] = current_ratio
            if current_ratio < 1.0:
                flags.append(QualityFlag(
                    flag_type=QualityFlagType.LIQUIDITY,
                    severity='critical',
                    metric_name='Current Ratio',
                    metric_value=current_ratio,
                    threshold=1.0,
                    description=f'Current ratio of {current_ratio:.2f} indicates current liabilities exceed current assets'
                ))
            elif current_ratio < 1.2:
                flags.append(QualityFlag(
                    flag_type=QualityFlagType.LIQUIDITY,
                    severity='warning',
                    metric_name='Current Ratio',
                    metric_value=current_ratio,
                    threshold=1.2,
                    description=f'Current ratio of {current_ratio:.2f} is tight, limited liquidity buffer'
                ))

        # Check 6: Interest Coverage
        int_coverage = self._calculate_interest_coverage(financials, info)
        if int_coverage is not None:
            metrics['interest_coverage'] = int_coverage
            if int_coverage < 1.5:
                flags.append(QualityFlag(
                    flag_type=QualityFlagType.SOLVENCY,
                    severity='critical',
                    metric_name='Interest Coverage',
                    metric_value=int_coverage,
                    threshold=1.5,
                    description=f'Interest coverage of {int_coverage:.2f}x is dangerously low'
                ))
            elif int_coverage < 2.5:
                flags.append(QualityFlag(
                    flag_type=QualityFlagType.SOLVENCY,
                    severity='warning',
                    metric_name='Interest Coverage',
                    metric_value=int_coverage,
                    threshold=2.5,
                    description=f'Interest coverage of {int_coverage:.2f}x is below comfortable levels'
                ))

        # Check 7: Debt Load (Debt/EBITDA)
        debt_ebitda = self._calculate_debt_to_ebitda(financials, info)
        if debt_ebitda is not None:
            if debt_ebitda > 5.0:
                flags.append(QualityFlag(
                    flag_type=QualityFlagType.SOLVENCY,
                    severity='critical',
                    metric_name='Debt/EBITDA',
                    metric_value=debt_ebitda,
                    threshold=5.0,
                    description=f'Debt/EBITDA of {debt_ebitda:.1f}x indicates dangerous leverage'
                ))
            elif debt_ebitda > 3.5:
                flags.append(QualityFlag(
                    flag_type=QualityFlagType.SOLVENCY,
                    severity='warning',
                    metric_name='Debt/EBITDA',
                    metric_value=debt_ebitda,
                    threshold=3.5,
                    description=f'Debt/EBITDA of {debt_ebitda:.1f}x is elevated'
                ))

        # ============== Determine Pass/Fail ==============

        critical_flags = [f for f in flags if f.severity == 'critical']
        warning_flags = [f for f in flags if f.severity == 'warning']

        # Fail if 2+ critical flags OR 1 critical + 2 warnings
        passed = not (
            len(critical_flags) >= 2 or
            (len(critical_flags) >= 1 and len(warning_flags) >= 2)
        )

        # Calculate confidence based on data availability
        data_points = sum([
            has_financials,
            bool(info),
            bool(holders.get('data_available'))
        ])
        confidence = min(0.3 + (data_points * 0.25), 0.95)

        result = QualityGateResult(
            passed=passed,
            flags=flags,
            confidence=confidence,
            data_quality='complete' if has_financials else 'partial',
            status='available' if has_financials else 'unknown',
            reason='' if has_financials else 'Financial statements incomplete',
            altman_z_score=metrics.get('altman_z_score'),
            current_ratio=metrics.get('current_ratio'),
            interest_coverage=metrics.get('interest_coverage'),
            cash_flow_quality=metrics.get('cash_flow_quality')
        )

        self._log_analysis(ticker, f"passed={passed}, flags={len(flags)}")
        return result

    def _check_cash_flow_quality(
        self, financials: Dict, info: Dict
    ) -> Optional[Dict[str, Any]]:
        """Check if operating cash flow supports net income."""
        try:
            # Try to get from financial statements
            cashflow = financials.get('quarterly_cashflow')
            income = financials.get('quarterly_income_stmt')

            if cashflow is not None and not cashflow.empty:
                if 'Operating Cash Flow' in cashflow.index:
                    cfo = cashflow.loc['Operating Cash Flow'].iloc[0]
                elif 'Total Cash From Operating Activities' in cashflow.index:
                    cfo = cashflow.loc['Total Cash From Operating Activities'].iloc[0]
                else:
                    cfo = None

                if cfo is not None and income is not None and not income.empty:
                    if 'Net Income' in income.index:
                        net_income = income.loc['Net Income'].iloc[0]
                        if net_income and net_income != 0:
                            ratio = cfo / net_income
                            flag = None

                            if ratio < 0 and net_income > 0:
                                flag = QualityFlag(
                                    flag_type=QualityFlagType.ACCOUNTING,
                                    severity='critical',
                                    metric_name='Cash Flow Quality',
                                    metric_value=ratio,
                                    threshold=0.5,
                                    description='Negative operating cash flow despite positive net income - potential earnings manipulation'
                                )
                            elif ratio < 0.5 and net_income > 0:
                                flag = QualityFlag(
                                    flag_type=QualityFlagType.ACCOUNTING,
                                    severity='warning',
                                    metric_name='Cash Flow Quality',
                                    metric_value=ratio,
                                    threshold=0.5,
                                    description=f'Operating cash flow is only {ratio:.1%} of net income - weak cash conversion'
                                )

                            return {'ratio': ratio, 'flag': flag}

            # Fallback to info dict
            cfo = info.get('operatingCashflow')
            net_income = info.get('netIncomeToCommon')
            if cfo and net_income and net_income != 0:
                ratio = cfo / net_income
                flag = None
                if ratio < 0 and net_income > 0:
                    flag = QualityFlag(
                        flag_type=QualityFlagType.ACCOUNTING,
                        severity='critical',
                        metric_name='Cash Flow Quality',
                        metric_value=ratio,
                        threshold=0.5,
                        description='Negative operating cash flow despite positive net income'
                    )
                return {'ratio': ratio, 'flag': flag}

        except Exception as e:
            logger.debug(f"Cash flow quality check failed: {e}")

        return None

    def _check_receivables_growth(self, financials: Dict) -> Optional[QualityFlag]:
        """Check if receivables are growing faster than revenue."""
        try:
            balance = financials.get('quarterly_balance_sheet')
            income = financials.get('quarterly_income_stmt')

            if balance is None or income is None:
                return None
            if balance.empty or income.empty:
                return None
            if len(balance.columns) < 2 or len(income.columns) < 2:
                return None

            # Get receivables
            if 'Net Receivables' in balance.index:
                ar_current = balance.loc['Net Receivables'].iloc[0]
                ar_prior = balance.loc['Net Receivables'].iloc[1]
            elif 'Accounts Receivable' in balance.index:
                ar_current = balance.loc['Accounts Receivable'].iloc[0]
                ar_prior = balance.loc['Accounts Receivable'].iloc[1]
            else:
                return None

            # Get revenue
            if 'Total Revenue' in income.index:
                rev_current = income.loc['Total Revenue'].iloc[0]
                rev_prior = income.loc['Total Revenue'].iloc[1]
            else:
                return None

            if ar_prior and ar_prior != 0 and rev_prior and rev_prior != 0:
                ar_growth = (ar_current - ar_prior) / ar_prior
                rev_growth = (rev_current - rev_prior) / rev_prior

                if ar_growth > rev_growth * 1.5 and ar_growth > 0.1:
                    return QualityFlag(
                        flag_type=QualityFlagType.ACCOUNTING,
                        severity='warning',
                        metric_name='Receivables Growth',
                        metric_value=ar_growth,
                        threshold=rev_growth * 1.5,
                        description=f'Receivables growing {ar_growth:.1%} vs revenue {rev_growth:.1%} - potential channel stuffing'
                    )

        except Exception as e:
            logger.debug(f"Receivables check failed: {e}")

        return None

    def _check_inventory_buildup(self, financials: Dict) -> Optional[QualityFlag]:
        """Check if inventory is building up relative to sales."""
        try:
            balance = financials.get('quarterly_balance_sheet')
            income = financials.get('quarterly_income_stmt')

            if balance is None or income is None:
                return None
            if balance.empty or income.empty:
                return None
            if len(balance.columns) < 2 or len(income.columns) < 2:
                return None

            if 'Inventory' not in balance.index:
                return None  # Company may not have inventory (e.g., services)

            inv_current = balance.loc['Inventory'].iloc[0]
            inv_prior = balance.loc['Inventory'].iloc[1]

            # Get COGS or revenue as proxy
            if 'Cost Of Revenue' in income.index:
                cogs_current = income.loc['Cost Of Revenue'].iloc[0]
                cogs_prior = income.loc['Cost Of Revenue'].iloc[1]
            elif 'Total Revenue' in income.index:
                cogs_current = income.loc['Total Revenue'].iloc[0]
                cogs_prior = income.loc['Total Revenue'].iloc[1]
            else:
                return None

            if inv_prior and inv_prior != 0 and cogs_prior and cogs_prior != 0:
                inv_growth = (inv_current - inv_prior) / inv_prior
                cogs_growth = (cogs_current - cogs_prior) / cogs_prior

                if inv_growth > cogs_growth * 1.5 and inv_growth > 0.15:
                    return QualityFlag(
                        flag_type=QualityFlagType.OPERATIONAL,
                        severity='warning',
                        metric_name='Inventory Buildup',
                        metric_value=inv_growth,
                        threshold=cogs_growth * 1.5,
                        description=f'Inventory growing {inv_growth:.1%} vs COGS {cogs_growth:.1%} - demand concerns'
                    )

        except Exception as e:
            logger.debug(f"Inventory check failed: {e}")

        return None

    def _calculate_altman_z(
        self, financials: Dict, info: Dict
    ) -> Optional[float]:
        """
        Calculate Altman Z-Score for bankruptcy prediction.

        Z = 1.2*A + 1.4*B + 3.3*C + 0.6*D + 1.0*E
        A = Working Capital / Total Assets
        B = Retained Earnings / Total Assets
        C = EBIT / Total Assets
        D = Market Value of Equity / Total Liabilities
        E = Sales / Total Assets
        """
        try:
            balance = financials.get('quarterly_balance_sheet')
            income = financials.get('quarterly_income_stmt')

            if balance is None or balance.empty:
                return None

            # Get required values
            total_assets = None
            for key in ['Total Assets', 'Total Assets']:
                if key in balance.index:
                    total_assets = balance.loc[key].iloc[0]
                    break

            if not total_assets or total_assets == 0:
                return None

            # Working Capital (Current Assets - Current Liabilities)
            current_assets = self._safe_get_from_df(balance, ['Total Current Assets', 'Current Assets'])
            current_liab = self._safe_get_from_df(balance, ['Total Current Liabilities', 'Current Liabilities'])
            working_capital = (current_assets or 0) - (current_liab or 0)

            # Retained Earnings
            retained_earnings = self._safe_get_from_df(balance, ['Retained Earnings'])

            # EBIT
            ebit = None
            if income is not None and not income.empty:
                ebit = self._safe_get_from_df(income, ['EBIT', 'Operating Income'])

            # Market Cap (from info)
            market_cap = info.get('marketCap', 0)

            # Total Liabilities
            total_liab = self._safe_get_from_df(balance, ['Total Liabilities Net Minority Interest', 'Total Liab'])

            # Sales/Revenue
            revenue = None
            if income is not None and not income.empty:
                revenue = self._safe_get_from_df(income, ['Total Revenue', 'Revenue'])

            # Calculate ratios
            A = working_capital / total_assets if total_assets else 0
            B = (retained_earnings or 0) / total_assets if total_assets else 0
            C = (ebit or 0) / total_assets if total_assets else 0
            D = market_cap / total_liab if total_liab and total_liab > 0 else 0
            E = (revenue or 0) / total_assets if total_assets else 0

            z_score = 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E
            return round(z_score, 2)

        except Exception as e:
            logger.debug(f"Altman Z calculation failed: {e}")
            return None

    def _calculate_current_ratio(
        self, financials: Dict, info: Dict
    ) -> Optional[float]:
        """Calculate current ratio from balance sheet or info."""
        # Try info first (simpler)
        if info.get('currentRatio'):
            return info['currentRatio']

        try:
            balance = financials.get('quarterly_balance_sheet')
            if balance is None or balance.empty:
                return None

            current_assets = self._safe_get_from_df(balance, ['Total Current Assets', 'Current Assets'])
            current_liab = self._safe_get_from_df(balance, ['Total Current Liabilities', 'Current Liabilities'])

            if current_assets and current_liab and current_liab > 0:
                return round(current_assets / current_liab, 2)

        except Exception as e:
            logger.debug(f"Current ratio calculation failed: {e}")

        return None

    def _calculate_interest_coverage(
        self, financials: Dict, info: Dict
    ) -> Optional[float]:
        """Calculate interest coverage ratio (EBIT / Interest Expense)."""
        try:
            income = financials.get('quarterly_income_stmt')
            if income is None or income.empty:
                return None

            ebit = self._safe_get_from_df(income, ['EBIT', 'Operating Income'])
            interest = self._safe_get_from_df(income, ['Interest Expense', 'Interest Expense Non Operating'])

            if ebit and interest and interest < 0:  # Interest is usually negative
                return round(ebit / abs(interest), 2)
            elif ebit and interest and interest > 0:
                return round(ebit / interest, 2)

        except Exception as e:
            logger.debug(f"Interest coverage calculation failed: {e}")

        return None

    def _calculate_debt_to_ebitda(
        self, financials: Dict, info: Dict
    ) -> Optional[float]:
        """Calculate Debt/EBITDA ratio."""
        try:
            # Try to get from info
            total_debt = info.get('totalDebt')
            ebitda = info.get('ebitda')

            if total_debt and ebitda and ebitda > 0:
                return round(total_debt / ebitda, 2)

            # Try from financials
            balance = financials.get('quarterly_balance_sheet')
            income = financials.get('quarterly_income_stmt')

            if balance is not None and not balance.empty:
                total_debt = self._safe_get_from_df(balance, ['Total Debt', 'Long Term Debt'])

            if income is not None and not income.empty:
                ebit = self._safe_get_from_df(income, ['EBIT', 'Operating Income'])
                depreciation = self._safe_get_from_df(income, ['Depreciation And Amortization', 'Depreciation'])
                if ebit and depreciation:
                    ebitda = ebit + abs(depreciation)

            if total_debt and ebitda and ebitda > 0:
                return round(total_debt / ebitda, 2)

        except Exception as e:
            logger.debug(f"Debt/EBITDA calculation failed: {e}")

        return None

    def _safe_get_from_df(
        self, df: pd.DataFrame, possible_keys: List[str]
    ) -> Optional[float]:
        """Safely get a value from DataFrame trying multiple possible keys."""
        if df is None or df.empty:
            return None

        for key in possible_keys:
            if key in df.index:
                val = df.loc[key].iloc[0]
                if pd.notna(val):
                    return float(val)
        return None
