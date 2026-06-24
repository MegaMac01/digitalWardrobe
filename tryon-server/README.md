# Local try-on server (CatVTON)

The photoreal "See it on me" feature calls a **virtual try-on model running on your
own GPU** — no API keys, no cost. We use [CatVTON](https://github.com/Zheng-Chong/CatVTON),
the only high-quality open-source try-on model that fits in 8GB of VRAM.

This server runs **separately** from the web app. The app (when run locally with
`npm run dev`) talks to it in the browser via `@gradio/client`.

> **Hardware:** an NVIDIA GPU with ~8GB VRAM (RTX 3070 or better). CatVTON in
> `bf16` generates 1024×768 in about 8GB — it's tight, so close other GPU apps.
> It only works while this server is running.

---

## One-time setup

CatVTON's README says Python 3.9, but it runs fine on a 3.11 `venv` — no conda
needed. (If a pinned dep ever refuses to install, fall back to Miniconda; see the
note at the end.)

### Using venv (Windows PowerShell, recommended here)

```powershell
# 1. Get the code
git clone https://github.com/Zheng-Chong/CatVTON
cd CatVTON

# 2. Create + activate a venv with OFFICIAL Windows Python (not MSYS2!).
#    Use the py launcher so you don't accidentally use a MinGW/MSYS2 python —
#    PyTorch's CUDA wheels only install on python.org (MSVC) builds.
#    `py -0p` lists installed versions; pick a 3.11/3.12 under C:\Python or
#    %LOCALAPPDATA%\Programs\Python.
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
# Sanity check you're in the right Python (should print a path inside .venv\Scripts):
python -c "import sys; print(sys.executable, sys.version)"
# If activation is blocked by execution policy, run this once for the session:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# ...or skip activation entirely and prefix commands with .\.venv\Scripts\python.exe

# 3. Remaining deps first (gradio, diffusers, etc.)
pip install -r requirements.txt

# 4. PyTorch with CUDA LAST, so it overrides any CPU-only torch that
#    requirements.txt may have pulled in (cu121 works on RTX 3070 / driver 595).
pip install --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Verify: must print a version ending in +cu121 and True
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

> **Conda alternative:** if you'd rather use conda (and have Miniconda installed):
> `conda create -n catvton python==3.9.0 -y && conda activate catvton`, then steps 3–4.

Model weights (CatVTON + Stable Diffusion 1.5 inpainting base) download
automatically from Hugging Face on first launch.

---

## Run it

PowerShell (env active):

```powershell
$env:CUDA_VISIBLE_DEVICES = "0"
python app.py --output_dir="resource/demo/output" --mixed_precision="bf16" --allow_tf32
```

(bash/conda equivalent: `CUDA_VISIBLE_DEVICES=0 python app.py --output_dir="resource/demo/output" --mixed_precision="bf16" --allow_tf32`)

When it's up it prints a local URL, usually **http://localhost:7860**.

- If 8GB isn't enough and you hit CUDA OOM: try `--mixed_precision="fp16"`, lower
  the resolution / inference steps in the UI, and make sure no other app is using
  the GPU. (`nvidia-smi` to check.)
- Leave this terminal running while you use try-on in the app.

---

## API shape (verified)

The web app calls the Gradio endpoint **`/submit_function`** with:

```
person_image (ImageEditor: {background, layers, composite}),
cloth_image, cloth_type ('upper'|'lower'|'overall'),
num_inference_steps, guidance_scale, seed, show_type
```

[`src/utils/tryOn.js`](../src/utils/tryOn.js) already matches this and sends a transparent
`layers[0]` so CatVTON auto-masks from `cloth_type` (no hand-drawn mask needed). If you
run a different CatVTON revision, re-check `gradio_client`'s `view_api()` output and adjust
that file. Confirmed working on Windows 11 + RTX 3070 (8GB) at 768×1024, bf16.

---

## Point the app at it

In the web app's `.env.local` (defaults to `http://localhost:7860` if unset):

```
VITE_TRYON_SERVER_URL=http://localhost:7860
```

Then run the app locally (`npm run dev`) and use **See it on me → Generate photoreal**.

Locally that's all you need. For the **deployed (Netlify) site**, see below.

---

## Use it on the live (Netlify) site

The hosted HTTPS site can't reach `http://localhost`, so your server must be exposed
over public HTTPS with a **tunnel**. We use **ngrok** with a free static domain so the
URL never changes.

> Try-on on the live site only works **while your PC + CatVTON server + ngrok are all
> running**. It's photoreal-on-your-own-GPU, so there's no always-on hosted option
> without paying for a cloud GPU.

**One-time ngrok setup**
1. Create a free account at https://ngrok.com and install ngrok.
2. Authenticate: `ngrok config add-authtoken <YOUR_TOKEN>` (from the ngrok dashboard).
3. In the dashboard → **Domains**, claim your free static domain (e.g.
   `your-name.ngrok-free.app`).

**Each session** (with the CatVTON server already running on port 7860):
```powershell
ngrok http 7860 --domain=your-name.ngrok-free.app
```
Leave it running alongside the server.

**Point the live app at it (once):**
Open the deployed site → **Profile → Try-on server** → paste
`https://your-name.ngrok-free.app` → **Save**. It's stored in your browser, so no
rebuild/redeploy is needed.

**Known hurdles** (tell me if you hit one):
- *ngrok browser-warning page* (free tier): if generation returns HTML instead of an
  image, ngrok's interstitial is interfering. The Gradio share link (`share=True`
  already prints a `*.gradio.live` URL) is a no-interstitial fallback — paste that URL
  instead (it changes each launch).
- *CORS*: the Gradio server reflects the request origin, so the Netlify origin should be
  allowed automatically. If you see a CORS error, flag it and we'll adjust the launch.

---

## Troubleshooting (verified on Windows 11 + RTX 3070, Python 3.12)

- **`Torch not compiled with CUDA enabled`** — a CPU torch got installed. Reinstall the
  CUDA build last (step 4): `pip install --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cu121`.
- **`ImportError: DLL load failed while importing _c_internal_utils` (matplotlib)** — the
  matplotlib wheel was corrupted. Reinstalling fixes it, but an unpinned reinstall pulls
  numpy 2.x / pillow 12 and breaks scipy/gradio/torch. Pin a coherent set instead:
  ```powershell
  pip install --no-cache-dir "numpy==1.26.4" "pillow==10.4.0" "matplotlib==3.9.2" "scipy==1.13.1"
  ```
- **Verify the whole stack agrees:**
  ```powershell
  python -c "import numpy,scipy,matplotlib,PIL,gradio,torch; print(torch.__version__, torch.cuda.is_available())"
  ```
  Known-good combo: torch 2.5.1+cu121, numpy 1.26.4, scipy 1.13.1, matplotlib 3.9.2,
  pillow 10.4.0, gradio 4.41.0.
- **`cannot import name 'clear_device_cache' from 'accelerate.utils.memory'`** —
  CatVTON's `requirements.txt` pins `accelerate==0.31.0` but installs `diffusers` from
  git main + `peft>=0.17`, which need a newer accelerate. Bump it:
  `pip install -U accelerate` (1.14.0 works).
- **`cannot import name 'Dinov2WithRegistersConfig' from 'transformers'`** — same cause:
  diffusers-main needs a newer transformers than the pinned 4.46.3. `pip install -U transformers`
  (brings transformers 5.x + huggingface-hub 1.x). Net effect: CatVTON's `git+diffusers` pin
  means the whole HF stack (diffusers/transformers/accelerate/peft/hub) must be on current
  releases together, not the older pins in its requirements.txt.
