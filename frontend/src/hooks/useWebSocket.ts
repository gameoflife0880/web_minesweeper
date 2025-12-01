// src/hooks/useWebSocket.ts

import { useState, useEffect, useCallback, useRef } from 'react';

// --- Configuration ---
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws'; 
const RECONNECT_INTERVAL = 3000; // 3 seconds between reconnection attempts
const MAX_RECONNECT_ATTEMPTS = Infinity; // Keep trying indefinitely

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
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptsRef = useRef<number>(0);
    const shouldReconnectRef = useRef<boolean>(true);
    const isConnectingRef = useRef<boolean>(false);

    // Connection function that can be called to establish or reconnect
    const connect = useCallback(() => {
        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        // Don't reconnect if we're already connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        // Don't reconnect if we've been told to stop
        if (!shouldReconnectRef.current) {
            return;
        }

        isConnectingRef.current = true;

        // Clean up existing connection if any
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (e) {
                // Ignore errors during cleanup
            }
        }

        if (!token) {
            console.warn("No authentication token provided. Connecting without token.");
        }

        const connectionUrl = `${WS_URL}?token=${token}`;

        try {
            // WebSocket instance is strongly typed
            const ws = new WebSocket(connectionUrl);
            wsRef.current = ws;
            isConnectingRef.current = false;

            // ON OPEN:
            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
            };

            // ON MESSAGE:
            ws.onmessage = (event: MessageEvent) => {
                // event.data is always a string from the server (JSON payload)
                setMessageQueue(prevQueue => [...prevQueue, event.data as string]);
            };

            // ON CLOSE:
            ws.onclose = (event: CloseEvent) => {
                console.log('WebSocket closed', event.code, event.reason);
                setIsConnected(false);
                isConnectingRef.current = false;

                // Attempt to reconnect if we should
                if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current += 1;
                    console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`);
                    
                    // Clear any existing reconnect timeout
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }

                    // Schedule reconnection attempt
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, RECONNECT_INTERVAL);
                }
            };

            // ON ERROR:
            ws.onerror = (error: Event) => {
                console.error('WebSocket Error:', error);
                setIsConnected(false);
                isConnectingRef.current = false;
                // Note: onclose will be called after onerror, so reconnection logic is handled there
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            isConnectingRef.current = false;
            setIsConnected(false);

            // Attempt to reconnect on error
            if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttemptsRef.current += 1;
                console.log(`Attempting to reconnect after error (attempt ${reconnectAttemptsRef.current})...`);
                
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }

                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, RECONNECT_INTERVAL);
            }
        }
    }, [token]);

    // --- 1. Connection & Disconnection Logic ---
    useEffect(() => {
        shouldReconnectRef.current = true;
        connect();

        // Cleanup: Runs when the hook/component unmounts or token changes
        return () => {
            shouldReconnectRef.current = false; // Stop reconnection attempts
            
            // Clear any pending reconnection attempts
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // Close WebSocket connection
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch (e) {
                    // Ignore errors during cleanup
                }
                wsRef.current = null;
            }
        };
    }, [connect]);

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