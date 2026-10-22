---
summary: "Use DotHoosh's OpenAI- and Anthropic-compatible gateway in OpenClaw"
read_when:
  - You want to use DotHoosh as a model provider
  - You need a DotHoosh API key or base URL setup
title: "DotHoosh"
---

[DotHoosh](https://gateway.dothoosh.com) is an AI API gateway for users in Iran.
It is billed in Toman from a prepaid wallet and serves Claude, GPT, Gemini,
DeepSeek and Kimi models with one API key. The bundled plugin ships a static
catalog and picks the right wire protocol per model.

| Property | Value                                                                   |
| -------- | ----------------------------------------------------------------------- |
| Provider | `dothoosh`                                                              |
| Auth     | `DOTHOOSH_API_KEY`                                                      |
| API      | OpenAI Chat Completions (default), OpenAI Responses, Anthropic Messages |
| Base URL | `https://gateway.dothoosh.com/v1`                                       |

## Getting started

<Steps>
  <Step title="Get an API key">
    Create a key at [gateway.dothoosh.com/api-keys](https://gateway.dothoosh.com/api-keys),
    or let onboarding prompt you for one.
  </Step>
  <Step title="Run onboarding">
    ```bash
    openclaw onboard --auth-choice dothoosh-api-key
    ```
  </Step>
  <Step title="Verify the default model">
    Onboarding sets the default model to `dothoosh/deepseek-v4-pro`.
    Confirm it is registered:

    ```bash
    openclaw models list --provider dothoosh
    ```

  </Step>
</Steps>

## Non-interactive setup

```bash
openclaw onboard --non-interactive \
  --auth-choice dothoosh-api-key \
  --dothoosh-api-key "$DOTHOOSH_API_KEY"
```

## Built-in catalog

DotHoosh accepts text input only, on every route. Prices are the vendors' USD
list prices per million tokens before DotHoosh converts them to Toman; see
[gateway.dothoosh.com/models](https://gateway.dothoosh.com/models) for the live
catalog.

| Model ref                        | Route              | Context   | Max output |
| -------------------------------- | ------------------ | --------- | ---------- |
| `dothoosh/deepseek-v4-pro`       | Chat Completions   | 1,000,000 | 384,000    |
| `dothoosh/deepseek-flash`        | Chat Completions   | 1,000,000 | 384,000    |
| `dothoosh/kimi-k3`               | Chat Completions   | 1,048,576 | 131,072    |
| `dothoosh/kimi-k2.7-code`        | Chat Completions   | 262,144   | 262,144    |
| `dothoosh/kimi-k2.6`             | Chat Completions   | 262,144   | 262,144    |
| `dothoosh/gemini-4-argon`        | Chat Completions   | 1,048,576 | 65,536     |
| `dothoosh/gemini-3.8-flash`      | Chat Completions   | 200,000   | 65,536     |
| `dothoosh/gemini-3.5-flash-lite` | Chat Completions   | 200,000   | 65,536     |
| `dothoosh/gpt-6.1-sol`           | Responses          | 272,000   | 128,000    |
| `dothoosh/gpt-6-astra`           | Responses          | 272,000   | 128,000    |
| `dothoosh/gpt-6-luna`            | Responses          | 272,000   | 128,000    |
| `dothoosh/claude-opus-5-5`       | Anthropic Messages | 1,000,000 | 128,000    |
| `dothoosh/claude-sonnet-5-5`     | Anthropic Messages | 1,000,000 | 128,000    |
| `dothoosh/claude-haiku-5-5`      | Anthropic Messages | 100,000   | 64,000     |
| `dothoosh/claude-fable-5-1`      | Anthropic Messages | 1,000,000 | 128,000    |

Claude models are served only on the Anthropic Messages route, and GPT-6 models
accept function tools only on the Responses route, so those entries override the
provider default per model.

<Warning>
OpenClaw's Anthropic client appends `/v1` to the base URL automatically. Claude
entries therefore use `https://gateway.dothoosh.com/anthropic` (the gateway
serves `/anthropic/v1/messages`), not `/anthropic/v1`.
</Warning>

## Config example

```json5
{
  env: { vars: { DOTHOOSH_API_KEY: "sk-..." } },
  agents: {
    defaults: {
      model: { primary: "dothoosh/deepseek-v4-pro" },
      models: { "dothoosh/deepseek-v4-pro": { alias: "DeepSeek V4 Pro" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      dothoosh: {
        baseUrl: "https://gateway.dothoosh.com/v1",
        apiKey: "${DOTHOOSH_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v4-pro",
            name: "DeepSeek V4 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 1.694, output: 5.082, cacheRead: 0.0565, cacheWrite: 0 },
            contextWindow: 1000000,
            maxTokens: 384000,
          },
          {
            id: "claude-sonnet-5-5",
            name: "Claude Sonnet 5.5",
            api: "anthropic-messages",
            baseUrl: "https://gateway.dothoosh.com/anthropic",
            reasoning: true,
            input: ["text"],
            cost: { input: 2.5667, output: 12.8333, cacheRead: 0.1283, cacheWrite: 2.5667 },
            contextWindow: 1000000,
            maxTokens: 128000,
          },
        ],
      },
    },
  },
}
```

<Tip>
Model refs use the form `dothoosh/<modelId>`. `GET /v1/models` on the gateway
lists the models your key may call; add any it advertises that the bundled
catalog does not yet include under `models.providers.dothoosh.models`.
</Tip>

<AccordionGroup>
  <Accordion title="Model allowlist">
    If you enable a model allowlist (`agents.defaults.modelPolicy.allow`), add every
    DotHoosh model you plan to use. Models not in the allowlist are hidden from the
    agent.
  </Accordion>

  <Accordion title="Base URL override">
    To route through your own proxy, override the base URL:

    ```json5
    {
      models: {
        providers: {
          dothoosh: {
            baseUrl: "https://proxy.example/v1",
          },
        },
      },
    }
    ```

    Per-model `baseUrl` entries (the Claude models) are separate and need their
    own override.

  </Accordion>
</AccordionGroup>
