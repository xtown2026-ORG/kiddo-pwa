import { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography
} from '@mui/material';
import {
  InstallMobile as InstallIcon,
  CloudOff as OfflineIcon,
  Wifi as OnlineIcon,
  Update as UpdateIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { usePwaInstall } from '../pwa/usePwaInstall';
import { offlineManager, updateServiceWorker } from '../pwa/serviceWorker';

export default function PWAStatus() {
  const { canInstall, isInstalled, install } = usePwaInstall();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [notification, setNotification] = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    // Listen to offline manager events
    const unsubscribe = offlineManager.addListener((event) => {
      switch (event.type) {
        case 'online':
          setIsOnline(true);
          setNotification({
            message: 'Connection restored',
            severity: 'success'
          });
          break;
        case 'offline':
          setIsOnline(false);
          setNotification({
            message: 'You are offline. Some features may be limited.',
            severity: 'warning'
          });
          break;
        case 'cache-updated':
          setShowUpdatePrompt(true);
          break;
      }
      setPendingRequests(offlineManager.getPendingRequestsCount());
    });

    // Listen for PWA notifications
    const handlePWANotification = (event) => {
      setNotification({
        message: event.detail.message,
        severity: event.detail.type
      });
    };

    window.addEventListener('pwa-notification', handlePWANotification);

    // Show install prompt after a delay if installable
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => {
        clearTimeout(timer);
        unsubscribe();
        window.removeEventListener('pwa-notification', handlePWANotification);
      };
    }

    return () => {
      unsubscribe();
      window.removeEventListener('pwa-notification', handlePWANotification);
    };
  }, [canInstall, isInstalled]);

  const handleInstall = async () => {
    try {
      const installed = await install();
      setShowInstallPrompt(false);
      setNotification({
        message: installed
          ? 'Kiddos app install started successfully.'
          : 'Install prompt dismissed. You can install it later from the browser menu.',
        severity: installed ? 'success' : 'info'
      });
    } catch (error) {
      console.error('Installation failed:', error);
      setNotification({
        message: 'Installation failed. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleUpdate = () => {
    updateServiceWorker();
    setShowUpdatePrompt(false);
  };

  const closeNotification = () => {
    setNotification(null);
  };

  return (
    <>
      {/* Connection Status Indicator Removed */}

      {/* Install App Dialog */}
      <Dialog
        open={showInstallPrompt}
        onClose={() => setShowInstallPrompt(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InstallIcon color="primary" />
          Install Kiddos PWA
          <IconButton
            onClick={() => setShowInstallPrompt(false)}
            sx={{ ml: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Install Kiddos PWA on your device for a better experience:
          </Typography>
          <Box component="ul" sx={{ mt: 2, pl: 2 }}>
            <Typography component="li" variant="body2">
              Access the app directly from your home screen
            </Typography>
            <Typography component="li" variant="body2">
              Work offline with cached content
            </Typography>
            <Typography component="li" variant="body2">
              Receive push notifications for important updates
            </Typography>
            <Typography component="li" variant="body2">
              Faster loading and native app-like experience
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstallPrompt(false)}>
            Maybe Later
          </Button>
          <Button
            onClick={handleInstall}
            variant="contained"
            startIcon={<InstallIcon />}
          >
            Install App
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Available Dialog */}
      <Dialog
        open={showUpdatePrompt}
        onClose={() => setShowUpdatePrompt(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UpdateIcon color="primary" />
          Update Available
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            A new version of Kiddos PWA is available. Update now to get the latest features and improvements.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUpdatePrompt(false)}>
            Later
          </Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            startIcon={<UpdateIcon />}
          >
            Update Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* General Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification && (
          <Alert
            onClose={closeNotification}
            severity={notification.severity}
            variant="filled"
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </>
  );
}
