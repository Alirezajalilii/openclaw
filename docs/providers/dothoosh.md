---
summary: "Use DotHoosh's OpenAI- and Anthropic-compatible gateway in OpenClaw"
read_when:
  - You want to use DotHoosh as a model provider
  - You need a DotHoosh API key or base URL setup
title: "DotHoosh"
---

[DotHoosh](https://gateway.dothoosh.com) is an AI API gateway for users in Iran.
It is billed in Toman from a prepaid wallet and serves Claude, GPT, Gemini,
DeepSeek and Kimi models with one API key. The bundled plugin reads the live
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

## Live catalog

The plugin has no built-in model list. With `DOTHOOSH_API_KEY` set, OpenClaw reads
`GET https://gateway.dothoosh.com/v1/models` and `GET https://gateway.dothoosh.com/anthropic/v1/models`
(cached for 60 seconds), so a new model or a price change shows up without an OpenClaw release.
Every row supplies the context window, output limit, text or image input, tool and reasoning
support, per-token prices (cache read and write included, converted to per-million) and the
long-context price tiers that apply to the whole request. Prices are the vendors' USD list prices
before DotHoosh converts them to Toman; see
[gateway.dothoosh.com/models](https://gateway.dothoosh.com/models) for the same data.

Routing follows the listing. Models served on the Anthropic route use Anthropic Messages, models
whose only OpenAI route is Responses use the Responses API, and the rest use Chat Completions.
Only the default model (`deepseek-v4-pro`) is seeded offline, with placeholder limits and no price,
so onboarding works before the first fetch; the live row replaces it.

A listing that is empty, an error body, or has no usable model on either route counts as an
outage, not as an empty catalog: the previous catalog stays and the next refresh retries.

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
        models: [],
      },
    },
  },
}
```

<Tip>
Model refs use the form `dothoosh/<modelId>`. The catalog is discovered from the
gateway, so `models` can stay empty. Run `openclaw models list --provider dothoosh`
to see what your key may call.
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
