# FitDiT local server (the garment-length upgrade)

[FitDiT](https://github.com/BoyuanJiang/FitDiT) is a higher-fidelity try-on model
whose key feature is a **length-aware mask** — it fixes CatVTON's "shorts render as
long pants" problem. Use it as the **Local** try-on engine in place of CatVTON.

> **Two heads-ups before you start:**
> 1. **The weights are gated.** You must request access on Hugging Face and wait for
>    approval — this is the slow part and may not be instant.
> 2. **The app's Local path currently calls CatVTON's API.** FitDiT has a different
>    (two-step: mask → try-on) Gradio API, so once it's running, send me its
>    `http://localhost:7860/?view=api` and I'll rewire the Local path to it. Until
>    then, keep using CatVTON for Local.

---

## 1. Request the weights (do this first)
On the FitDiT model's Hugging Face page, click to request access. Wait for approval,
then you'll be able to download/clone the weights.

## 2. Install (Windows PowerShell)
FitDiT pins older libs (torch 2.4.0, diffusers 0.31.0, transformers 4.39.3,
gradio 5.8.0, onnxruntime-gpu 1.20.1). Use **official** Python (the `py` launcher),
not MSYS2 — same lesson as CatVTON.

```powershell
git clone https://github.com/BoyuanJiang/FitDiT
cd FitDiT
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Install the CUDA torch build LAST so it isn't overwritten by a CPU wheel:
pip install --force-reinstall torch==2.4.0 torchvision==0.19.0 --index-url https://download.pytorch.org/whl/cu121
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"  # want True
```

Download the approved weights to a local folder (e.g. `./fitdit-weights`) via
`huggingface-cli download <repo> --local-dir fitdit-weights` (after `huggingface-cli login`).

## 3. Run it (8GB-friendly)
```powershell
$env:CUDA_VISIBLE_DEVICES = "0"
python gradio_sd3.py --model_path fitdit-weights --fp16 --aggressive_offload
```
`--aggressive_offload` keeps it within 8GB (slower per image). It serves on
**http://localhost:7860**. Expect the usual dependency wrangling — paste any errors
and I'll help, same as we did for CatVTON.

## 4. Point the app at it
Profile → **Try-on engine** → **Local**, server URL `http://localhost:7860` → Save.
Then send me the `/?view=api` output so I can switch the Local call from CatVTON's
`/submit_function` to FitDiT's mask + try-on endpoints.

> Reminder: FitDiT (like all these models) does **tops/bottoms/dresses only** — shoes
> and hats are still pasted on afterward by the app's overlay, not generated.
