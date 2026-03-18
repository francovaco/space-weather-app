"""
LSTM model for Kp index prediction.
Input: sequence of [bz, wind_speed, kp] vectors over the last 24 hours
Output: predicted Kp at +1h, +3h, +6h horizons
"""
import torch
import torch.nn as nn


class KpLSTM(nn.Module):
    """
    2-layer LSTM Kp predictor.
    Input shape: (batch, seq_len, 3)  — [bz, wind_speed, kp]
    Output shape: (batch, 3)          — [kp_1h, kp_3h, kp_6h]
    """

    def __init__(
        self,
        input_size: int = 3,
        hidden_size: int = 64,
        num_layers: int = 2,
        output_size: int = 3,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, input_size)
        lstm_out, _ = self.lstm(x)
        # Take the last time step
        last_out = self.dropout(lstm_out[:, -1, :])
        return self.fc(last_out)  # (batch, output_size)
