interface StatusMessageProps {
  message: string;
}

export default function StatusMessage({ message }: StatusMessageProps) {
  if (!message) return null;

  return (
    <div style={{
      padding: '12px',
      borderRadius: '4px',
      backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
      color: message.includes('✅') ? '#155724' : '#721c24',
      border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
      fontSize: '14px'
    }}>
      {message}
    </div>
  );
}