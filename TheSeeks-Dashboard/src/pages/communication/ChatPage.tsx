import React from 'react';
import ChatPortal from '../../components/chat/ChatPortal';

export default function ChatPage() {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Academy Chat</div>
          <div className="page-sub">Communicate with students and staff instantly</div>
        </div>
      </div>

      <div style={{
        position: 'relative', width: '100%', flex: 1, minHeight: 0,
        borderRadius: '8px', overflow: 'hidden',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ChatPortal inPage />
      </div>
    </div>
  );
}
