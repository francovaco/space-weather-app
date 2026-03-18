import torch
import json
from pathlib import Path
from model import KpLSTM

WEIGHTS_DIR = Path("weights")
checkpoint = torch.load(WEIGHTS_DIR / "kp_lstm.pt", map_location="cpu", weights_only=True)
model = KpLSTM()
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

torch.onnx.export(
    model,
    torch.zeros(1, 24, 3),
    WEIGHTS_DIR / "kp_lstm.onnx",
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=17,
)

with open(WEIGHTS_DIR / "norms.json", "w") as f:
    json.dump({
        **checkpoint["norms"],
        "trained_at": checkpoint["trained_at"],
        "version": checkpoint["version"],
    }, f)

print("Exportado OK")
