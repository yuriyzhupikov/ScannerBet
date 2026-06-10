# Safe Scope

This service is limited to synthetic, local demo, or explicitly authorized non-gambling numeric data feeds.

The MVP must not include:

- betting odds APIs;
- sports betting, prediction market, or gambling provider integrations;
- scraping closed front APIs;
- cookie/session-token collection;
- CAPTCHA, geo, age-gate, rate-limit, paywall, or anti-bot bypass;
- bet placement, coupon filling, ROI recommendations, or arbitrage signals.

Provider sources cannot be activated unless `authorizationApproved=true`. Real authorized integrations must keep credentials outside logs, raw payloads, audit metadata, and public configuration.

