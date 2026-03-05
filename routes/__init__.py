"""Blueprint route modules for StockPulse API.

This package contains Flask Blueprints for organizing the API endpoints.
Import and register these blueprints in app.py to modularize the monolith.

Blueprint registration order (for future refactoring):
    from routes.analysis import analysis_bp
    from routes.screening import screening_bp
    from routes.market import market_bp
    from routes.trading import trading_bp
    from routes.data_sources import data_sources_bp
    from routes.backtest import backtest_bp
    from routes.misc import misc_bp
    from routes.static_pages import static_bp

    app.register_blueprint(analysis_bp)
    app.register_blueprint(screening_bp)
    app.register_blueprint(market_bp)
    app.register_blueprint(trading_bp)
    app.register_blueprint(data_sources_bp)
    app.register_blueprint(backtest_bp)
    app.register_blueprint(misc_bp)
    app.register_blueprint(static_bp)
"""
