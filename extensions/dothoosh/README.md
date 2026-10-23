# OpenClaw DotHoosh Provider

Bundled OpenClaw provider plugin for DotHoosh, an AI API gateway that serves
Claude, GPT, Gemini, DeepSeek and Kimi models through one key.

Set `DOTHOOSH_API_KEY` (create one at https://gateway.dothoosh.com/api-keys),
then select a `dothoosh/<model-id>` model. Models, limits and prices are read
live from the gateway's `/v1/models` and `/anthropic/v1/models`; nothing is
hard-coded in the plugin.

See https://docs.openclaw.ai/providers/dothoosh for model and configuration
details.
