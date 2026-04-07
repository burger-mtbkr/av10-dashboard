import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import InfoIcon from '@mui/icons-material/Info';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface SystemCardProps {
  power: 'ON' | 'OFF' | 'STANDBY';
  ecoMode: string;
  lastUpdate: string;
  connected: boolean;
}

export default function SystemCard({ power, ecoMode, lastUpdate, connected }: SystemCardProps) {
  const { t } = useTranslation();

  const formatTime = (iso: string): string => {
    if (!iso) return '---';
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>
          <InfoIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 22 }} />
          {t('cards.system.title')}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Power */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PowerSettingsNewIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {t('cards.system.power')}
              </Typography>
            </Box>
            <Chip
              label={power}
              size="small"
              color={power === 'ON' ? 'success' : power === 'STANDBY' ? 'warning' : 'default'}
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {/* ECO Mode */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EnergySavingsLeafIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {t('cards.system.ecoMode')}
              </Typography>
            </Box>
            <Chip
              label={ecoMode || '---'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Box>

          {/* Last Update */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {t('cards.system.lastUpdate')}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(lastUpdate)}
            </Typography>
          </Box>

          {/* Connection indicator */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Chip
              label={connected ? t('dashboard.connectionStatus.connected') : t('dashboard.connectionStatus.disconnected')}
              size="small"
              color={connected ? 'success' : 'error'}
              variant="outlined"
              sx={{
                fontWeight: 600,
                '& .MuiChip-label': { px: 2 },
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
