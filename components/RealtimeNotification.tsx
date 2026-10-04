import { useEffect, useRef, useState } from 'react';
import './RealtimeNotification.css';

interface RealtimeNotificationProps {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
}

export const RealtimeNotification: React.FC<RealtimeNotificationProps> = ({
  message,
  type,
  duration = 6000,
  onClose
}) => {
  const [visible, setVisible] = useState(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onCloseRef.current?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  const icons = {
    success: '✅',
    info: '📡',
    warning: '⚠️',
    error: '❌'
  };

  return (
    <div className={`realtime-notification realtime-notification-${type}`}>
      <span className="realtime-notification-icon">{icons[type]}</span>
      <span className="realtime-notification-message">{message}</span>
      <button 
        className="realtime-notification-close" 
        onClick={() => {
          setVisible(false);
          onClose?.();
        }}
      >
        ×
      </button>
    </div>
  );
};

interface RealtimeNotificationsManagerProps {
  notifications: Array<{
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }>;
  onRemove: (id: string) => void;
}

export const RealtimeNotificationsManager: React.FC<RealtimeNotificationsManagerProps> = ({
  notifications,
  onRemove
}) => {
  return (
    <div className="realtime-notifications-container">
      {notifications.map((notification) => (
        <RealtimeNotification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
};
