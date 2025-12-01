// src/hooks/useWebSocket.ts

import { useState, useEffect, useCallback, useRef } from 'react';

// --- Configuration ---
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws'; 

// --- Type Definitions ---

// Define the basic structure for a client action
interface CellAction {
    type: 'REVEAL' | 'FLAG' | string;
    x: number;
    y: number;
    [key: string]: any; // Allow other properties
}

// Define the public interface (return type) of the hook
interface WebSocketAPI {
    isConnected: boolean;
    messageQueue: string[];
    sendAction: (action: CellAction) => void;
    clearMessageQueue: () => void;
    removeProcessedMessages: (count: number) => void;
}

/**
 * Custom hook to manage the WebSocket connection and message flow.
 * @param token - The authentication token (JWT) for the player.
 */
export const useWebSocket = (token: string = ""): WebSocketAPI => {
    // State for connection status and received messages (string format)
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [messageQueue, setMessageQueue] = useState<string[]>([]);

    // useRef to hold the mutable WebSocket instance
    const wsRef = useRef<WebSocket | null>(null);

    // --- 1. Connection & Disconnection Logic ---
    useEffect(() => {
        if (!token) {
            console.warn("No authentication token provided. Connecting without token.");
        }

        const connectionUrl = `${WS_URL}?token=${token}`;

        // WebSocket instance is strongly typed
        const ws = new WebSocket(connectionUrl);
        wsRef.current = ws;

        // ON OPEN:
        ws.onopen = () => {
            setIsConnected(true);
        };

        // ON MESSAGE:
        ws.onmessage = (event: MessageEvent) => {
            // event.data is always a string from the server (JSON payload)
            setMessageQueue(prevQueue => [...prevQueue, event.data as string]);
        };

        // ON CLOSE:
        ws.onclose = () => {
            setIsConnected(false);
        };

        // ON ERROR:
        ws.onerror = (error: Event) => {
            console.error('WebSocket Error:', error);
            setIsConnected(false);
        };

        // Cleanup: Runs when the hook/component unmounts or token changes
        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, [token]);

    // --- 2. Action Sending Function ---
    // The 'action' parameter is explicitly typed as GameAction
    const sendAction = useCallback((action: CellAction) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket is not open. Cannot send action.");
            return;
        }

        try {
            const jsonAction = JSON.stringify(action);
            wsRef.current.send(jsonAction);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }, []);

    const clearMessageQueue = useCallback(() => {
        setMessageQueue([]);
    }, []);

    const removeProcessedMessages = useCallback((count: number) => {
        setMessageQueue(prevQueue => {
            if (count >= prevQueue.length) {
                return [];
            }
            return prevQueue.slice(count);
        });
    }, []);

    // --- 3. Return Values ---
    return {
        isConnected,
        messageQueue,
        sendAction,
        clearMessageQueue,
        removeProcessedMessages,
    };
};