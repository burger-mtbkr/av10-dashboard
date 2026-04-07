import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SpeakerIcon from '@mui/icons-material/Speaker';
import type { SpeakerStatus } from '../types';

interface SpeakerCardProps {
  speakers: SpeakerStatus[];
}

/** Map of speaker codes to approximate position for visual layout */
const SPEAKER_POSITIONS: Record<string, { row: number; col: number }> = {
  // Height / Atmos - top row
  TFL: { row: 0, col: 1 }, FHL: { row: 0, col: 1 }, FDL: { row: 0, col: 1 },
  TFR: { row: 0, col: 5 }, FHR: { row: 0, col: 5 }, FDR: { row: 0, col: 5 },
  TML: { row: 0, col: 2 }, CH: { row: 0, col: 3 }, TMR: { row: 0, col: 4 },
  TRL: { row: 0, col: 2 }, RHL: { row: 0, col: 2 }, BDL: { row: 0, col: 2 },
  TRR: { row: 0, col: 4 }, RHR: { row: 0, col: 4 }, BDR: { row: 0, col: 4 },
  SHL: { row: 0, col: 1 }, SHR: { row: 0, col: 5 },
  TS: { row: 0, col: 3 },
  SDL: { row: 0, col: 2 }, SDR: { row: 0, col: 4 },
  // Ear level - middle
  FL: { row: 1, col: 1 }, FR: { row: 1, col: 5 },
  C: { row: 1, col: 3 },
  FWL: { row: 1, col: 0 }, FWR: { row: 1, col: 6 },
  SL: { row: 2, col: 0 }, SR: { row: 2, col: 6 },
  SBL: { row: 3, col: 1 }, SBR: { row: 3, col: 5 },
  SB: { row: 3, col: 3 },
  // Subwoofers - bottom
  SW: { row: 4, col: 1 }, SW2: { row: 4, col: 5 },
  SW3: { row: 4, col: 2 }, SW4: { row: 4, col: 4 },
};

function SpeakerBlock({ speaker }: { speaker: SpeakerStatus }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: speaker.active
            ? 'rgba(102, 187, 106, 0.15)'
            : 'rgba(255, 255, 255, 0.04)',
          border: '1.5px solid',
          borderColor: speaker.active
            ? 'secondary.main'
            : 'rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          boxShadow: speaker.active
            ? '0 0 12px rgba(102, 187, 106, 0.2)'
            : 'none',
        }}
      >
        <SpeakerIcon
          sx={{
            fontSize: 20,
            color: speaker.active ? 'secondary.main' : 'rgba(255,255,255,0.2)',
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.6rem',
          color: speaker.active ? 'secondary.main' : 'text.secondary',
          fontWeight: speaker.active ? 600 : 400,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {speaker.code}
      </Typography>
    </Box>
  );
}

export default function SpeakerCard({ speakers }: SpeakerCardProps) {
  const { t } = useTranslation();

  if (!speakers.length) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            <SpeakerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {t('cards.speakers.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No speaker data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Group speakers by type
  const groups = {
    height: speakers.filter((s) => s.group === 'height'),
    ear: speakers.filter((s) => s.group === 'ear' || s.group === 'wide' || s.group === 'back'),
    sub: speakers.filter((s) => s.group === 'sub'),
  };

  const activeCount = speakers.filter((s) => s.active).length;
  const totalCount = speakers.length;

  // Compute layout label like "7.2.4"
  const earActive = speakers.filter(s => (s.group === 'ear' || s.group === 'wide' || s.group === 'back') && s.active).length;
  const subActive = speakers.filter(s => s.group === 'sub' && s.active).length;
  const heightActive = speakers.filter(s => s.group === 'height' && s.active).length;
  const layoutLabel = `${earActive}.${subActive}.${heightActive}`;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'primary.main' }}>
            <SpeakerIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 22 }} />
            {t('cards.speakers.title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={layoutLabel}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.8rem' }}
            />
            <Chip
              label={`${activeCount}/${totalCount}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* Height speakers */}
        {groups.height.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('cards.speakers.groups.height')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {groups.height.map((s) => (
                <SpeakerBlock key={s.code} speaker={s} />
              ))}
            </Box>
          </Box>
        )}

        {/* Ear-level speakers */}
        {groups.ear.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('cards.speakers.groups.ear')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {groups.ear.map((s) => (
                <SpeakerBlock key={s.code} speaker={s} />
              ))}
            </Box>
          </Box>
        )}

        {/* Subwoofers */}
        {groups.sub.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('cards.speakers.groups.sub')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {groups.sub.map((s) => (
                <SpeakerBlock key={s.code} speaker={s} />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
