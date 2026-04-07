import { useState, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, Slider, IconButton, Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';

interface VolumeCardProps {
  volume: number;
  volumeDisplay: string;
  maxVolume: number;
  muted: boolean;
  onVolumeChange: (vol: number) => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onToggleMute: () => void;
}

export default function VolumeCard({
  volume,
  volumeDisplay,
  maxVolume,
  muted,
  onVolumeChange,
  onVolumeUp,
  onVolumeDown,
  onToggleMute,
}: VolumeCardProps) {
  const { t } = useTranslation();
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  const displayVol = localVolume !== null ? localVolume : volume;

  const handleSliderChange = useCallback((_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setLocalVolume(v);
  }, []);

  const handleSliderCommit = useCallback(
    (_: React.SyntheticEvent | Event, value: number | number[]) => {
      const v = Array.isArray(value) ? value[0] : value;
      onVolumeChange(v);
      setLocalVolume(null);
    },
    [onVolumeChange],
  );

  // Color based on volume level
  const getVolumeColor = (vol: number): string => {
    if (vol >= -10) return '#ef5350'; // loud - red
    if (vol >= -25) return '#ffa726'; // medium - orange
    return '#66bb6a'; // normal - green
  };

  const volumePercent = Math.round(((displayVol + 80) / (maxVolume + 80)) * 100);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>
            <VolumeUpIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 22 }} />
            {t('cards.volume.title')}
          </Typography>
          {muted && (
            <Chip
              icon={<VolumeOffIcon />}
              label={t('cards.volume.muted')}
              color="error"
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* Big volume display */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: muted ? 'error.main' : getVolumeColor(displayVol),
              fontVariantNumeric: 'tabular-nums',
              opacity: muted ? 0.5 : 1,
              textDecoration: muted ? 'line-through' : 'none',
              lineHeight: 1,
            }}
          >
            {displayVol.toFixed(1)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            dB ({volumePercent}%)
          </Typography>
        </Box>

        {/* Slider with controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
          <IconButton
            onClick={onVolumeDown}
            size="small"
            sx={{ color: 'primary.main' }}
          >
            <VolumeDownIcon />
          </IconButton>

          <Slider
            value={displayVol}
            min={-80}
            max={maxVolume}
            step={0.5}
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderCommit}
            sx={{
              color: getVolumeColor(displayVol),
              '& .MuiSlider-track': {
                background: `linear-gradient(90deg, #66bb6a 0%, #ffa726 60%, #ef5350 100%)`,
              },
            }}
          />

          <IconButton
            onClick={onVolumeUp}
            size="small"
            sx={{ color: 'primary.main' }}
          >
            <VolumeUpIcon />
          </IconButton>

          <IconButton
            onClick={onToggleMute}
            size="small"
            sx={{ color: muted ? 'error.main' : 'text.secondary' }}
          >
            {muted ? <VolumeOffIcon /> : <VolumeMuteIcon />}
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}
