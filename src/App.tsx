import React from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Effect, Console } from 'effect';
import WavingHandIcon from '@mui/icons-material/WavingHand';

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
  yield* Console.log('Hello World from Effect.js!');
  return 'Greeting executed successfully!';
});

function App() {
  const handleEffectClick = () => {
    Effect.runSync(greetingEffect);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <WavingHandIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom>
              Hello World!
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              React + TypeScript + Effect.js + Material Design 3
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            size="large" 
            onClick={handleEffectClick}
            sx={{ mt: 2 }}
          >
            Run Effect.js Console Log
          </Button>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
