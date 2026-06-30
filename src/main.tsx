import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {AuthProvider} from '../contexts/AuthContext.tsx';
import App from './App.tsx';
import './index.css';

// Global patch to prevent React crashes caused by browser extensions or translation tools modifying the DOM
if (typeof window !== 'undefined' && typeof Node !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: any, child: T): T {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: any, newChild: T, refChild: Node | null): T {
    if (refChild && refChild.parentNode !== this) {
      return originalInsertBefore.call(this, newChild, null);
    }
    return originalInsertBefore.call(this, newChild, refChild);
  };
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
