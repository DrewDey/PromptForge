# Browser Capture Notes

## General

- Use Chrome for logged-in third-party model sessions and PathForge.
- Prefer DOM text extraction for prompt/response text.
- Use screenshots for visual confirmation, not as the only source of exact text.
- Save code from model responses exactly. Do not manually rewrite code while capturing.

## ChatGPT

- Start from `https://chatgpt.com/`.
- New chat is acceptable.
- Capture source URL after the response completes.
- If a share/source-run link is available, include it.

## Claude

- Start from `https://claude.ai/new`.
- Capture artifact code from the response or artifact panel.
- If Claude creates an artifact that can be downloaded, download/save it and preserve exact response text separately.

## Gemini

- Start from `https://gemini.google.com/app`.
- Watch for responses that hide code in expandable sections.
- Capture all visible answer text and code blocks.

## OpenRouter

- Start from `https://openrouter.ai/chat`.
- Choose the requested model when possible.
- Capture model name from the selected model UI.

## PathForge

- Start from `https://prompt-forge-sandy.vercel.app/build`.
- Confirm Chrome is logged into the dedicated PathForge seed profile, not the user's personal/admin profile. If it is not, stop and let the user complete the profile switch/login.
- Check `references/profile-registry.md` before using or creating any seed profile, and update it after any profile switch, creation, use, retirement, or blocker.
- Prefer a project-owned seed-profile provisioner or admin workflow when available; do not improvise raw Supabase writes from browser-capture work.
- For sign-up/profile creation, fill realistic public fields and user-approved non-secret login identifiers, then pause for the user to enter or approve passwords, OTPs, email confirmations, CAPTCHA, or password-manager prompts.
- After the user completes credential/security steps, resume the browser flow and update the registry with visible non-secret details.
- If not logged in, stop and let the user complete login.
- Always use source-run mode and let the PathForge agent structure the run.
- Do not use manual entry unless the user explicitly asks for manual entry in that turn.
- Submit only as pending review unless explicitly told to approve.
