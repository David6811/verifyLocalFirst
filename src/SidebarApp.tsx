import React from 'react';
import { Paper, Typography, Button, Box, IconButton } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Effect, Console } from 'effect';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import CloseIcon from '@mui/icons-material/Close';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4',
    },
    secondary: {
      main: '#625B71',
    },
  },
});

const greetingEffect = Effect.gen(function* () {
  yield* Console.log('Hello World from Effect.js in sidebar!');
  return 'Greeting executed successfully!';
});

interface SidebarAppProps {
  onClose: () => void;
}

function SidebarApp({ onClose }: SidebarAppProps) {
  const handleEffectClick = () => {
    Effect.runSync(greetingEffect);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Paper 
        elevation={3} 
        sx={{ 
          height: '100vh', 
          width: '400px', 
          p: 3, 
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h1" color="primary.main">
            MateMe Chat
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <WavingHandIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, alignSelf: 'center' }} />
          <Typography variant="h5" component="h2" gutterBottom>
            Hello World!
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            React + TypeScript + Effect.js + Material Design 3
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleEffectClick}
            sx={{ alignSelf: 'center' }}
          >
            Run Effect.js Console Log
          </Button>
        </Box>
      </Paper>
    </ThemeProvider>
  );
}

export default SidebarApp;