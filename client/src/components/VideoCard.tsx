import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import VideocamIcon from '@mui/icons-material/Videocam';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HdrOnIcon from '@mui/icons-material/HdrOn';
import type { VideoInfo } from '../types';

interface VideoCardProps {
  video: VideoInfo;
}

export default function VideoCard({ video }: VideoCardProps) {
  const { t } = useTranslation();

  const isHdr = video.hdrFormat && video.hdrFormat !== '---' && video.hdrFormat !== 'None';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>
          <VideocamIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 22 }} />
          {t('cards.video.title')}
        </Typography>

        {/* Signal flow: Input → Output */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            mb: 2,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(79, 195, 247, 0.05)',
            border: '1px solid rgba(79, 195, 247, 0.1)',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
              {t('cards.video.inputResolution')}
            </Typography>
            <Chip
              label={video.inputResolution || '---'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, mt: 0.5 }}
            />
          </Box>

          <ArrowForwardIcon sx={{ color: 'primary.main', fontSize: 20 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
              {t('cards.video.outputResolution')}
            </Typography>
            <Chip
              label={video.outputResolution || '---'}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600, mt: 0.5 }}
            />
          </Box>
        </Box>

        {/* HDR and HDMI info */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          {isHdr && (
            <Chip
              icon={<HdrOnIcon />}
              label={video.hdrFormat}
              color="warning"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
          <Chip
            label={`HDMI: ${video.hdmiOutput}`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
          {video.inputSignal && video.inputSignal !== '---' && (
            <Chip
              label={video.inputSignal}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
