
import React, { useState, useRef, useEffect } from 'react';

interface ViewerProps {
    offer: RTCSessionDescriptionInit | null;
    onAnswerCreated: (answer: RTCSessionDescriptionInit) => void;
    onIceCandidate: (candidate: RTCIceCandidate) => void;
    broadcasterIceCandidates: RTCIceCandidate[];
    isStreaming: boolean;
}

const TvIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);


const Viewer: React.FC<ViewerProps> = ({ offer, onAnswerCreated, onIceCandidate, broadcasterIceCandidates, isStreaming }) => {
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<'offline' | 'connecting' | 'connected'>('offline');
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    useEffect(() => {
        if (!offer && peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
            setRemoteStream(null);
            setConnectionState('offline');
        }

        if (offer && !peerConnectionRef.current) {
            const createAnswer = async () => {
                setConnectionState('connecting');
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                peerConnectionRef.current = pc;

                pc.onicecandidate = event => {
                    if (event.candidate) {
                        onIceCandidate(event.candidate);
                    }
                };
                
                pc.ontrack = event => {
                    setRemoteStream(event.streams[0]);
                };

                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === 'connected') {
                        setConnectionState('connected');
                    } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
                        setConnectionState('offline');
                    } else {
                        setConnectionState('connecting');
                    }
                };

                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    onAnswerCreated(answer);
                } catch (error) {
                    console.error("Error creating answer:", error);
                    setConnectionState('offline');
                }
            };
            createAnswer();
        }
    }, [offer, onAnswerCreated, onIceCandidate]);

    useEffect(() => {
        const addCandidates = async () => {
             if (peerConnectionRef.current && broadcasterIceCandidates.length > 0) {
                for (const candidate of broadcasterIceCandidates) {
                    try {
                       await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (error) {
                        console.error('Error adding received ICE candidate', error);
                    }
                }
            }
        };
        addCandidates();
    }, [broadcasterIceCandidates]);

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);
    
    const getStatus = () => {
        if (!isStreaming) return { text: "Offline", color: "text-gray-500" };
        switch(connectionState) {
            case 'connecting': return { text: "Connecting...", color: "text-yellow-400" };
            case 'connected': return { text: "Live", color: "text-green-400" };
            case 'offline':
            default:
                return { text: "Waiting for stream...", color: "text-gray-400" };
        }
    };

    const status = getStatus();

    return (
        <div className="bg-gray-800 rounded-lg shadow-2xl p-6 flex flex-col h-full">
            <h2 className="text-2xl font-semibold mb-4 text-indigo-400 flex items-center justify-between">
                <div className="flex items-center">
                    <TvIcon className="w-6 h-6 mr-2" />
                    Viewer
                </div>
                <div className="flex items-center text-sm">
                    <span className={`w-3 h-3 rounded-full mr-2 ${status.color.replace('text-', 'bg-')}`}></span>
                    <span className={status.color}>{status.text}</span>
                </div>
            </h2>
            <div className="aspect-video bg-black rounded-md mb-4 flex items-center justify-center relative overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                {!remoteStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                         <TvIcon className="w-16 h-16" />
                        <p className="mt-2 text-center px-4">{status.text}</p>
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-400 mt-auto text-center">
                The video stream from the broadcaster will be displayed here once a connection is established.
            </p>
        </div>
    );
};

export default Viewer;
