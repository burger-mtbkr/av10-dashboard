import {
  Card, CardContent, Typography, Box, FormControl, Select, MenuItem, Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import InputIcon from '@mui/icons-material/Input';
import type { InputSource } from '../types';

interface InputCardProps {
  currentInput: InputSource;
  availableInputs: InputSource[];
  onInputChange: (inputId: string) => void;
}

export default function InputCard({ currentInput, availableInputs, onInputChange }: InputCardProps) {
  const { t } = useTranslation();

  const handleChange = (event: SelectChangeEvent<string>) => {
    onInputChange(event.target.value);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>
          <InputIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 22 }} />
          {t('cards.input.title')}
        </Typography>

        {/* Current input display */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Chip
            label={currentInput.name || currentInput.id || '---'}
            color="primary"
            sx={{
              fontSize: '1.1rem',
              fontWeight: 700,
              px: 3,
              py: 2.5,
              height: 'auto',
              '& .MuiChip-label': { px: 2 },
            }}
          />
        </Box>

        {/* Input selector */}
        {availableInputs.length > 0 && (
          <FormControl fullWidth size="small">
            <Select
              value={currentInput.id}
              onChange={handleChange}
              sx={{
                '& .MuiSelect-select': {
                  py: 1,
                },
              }}
            >
              {availableInputs.map((input) => (
                <MenuItem key={input.id} value={input.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Typography>{input.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      {input.id}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </CardContent>
    </Card>
  );
}
