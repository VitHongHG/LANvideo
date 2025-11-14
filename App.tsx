
import React, { useState, useCallback } from 'react';
import Broadcaster from './components/Broadcaster';
import Viewer from './components/Viewer';

const App: React.FC = () => {
    const [offer, setOffer] = useState<RTCSessionDescriptionInit | null>(null);
    const [answer, setAnswer] = useState<RTCSessionDescriptionInit | null>(null);
    const [broadcasterIceCandidates, setBroadcasterIceCandidates] = useState<RTCIceCandidate[]>([]);
    const [viewerIceCandidates, setViewerIceCandidates] = useState<RTCIceCandidate[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    const handleOfferCreated = useCallback((newOffer: RTCSessionDescriptionInit) => {
        setOffer(newOffer);
    }, []);
    
    const handleAnswerCreated = useCallback((newAnswer: RTCSessionDescriptionInit) => {
        setAnswer(newAnswer);
    }, []);

    const handleBroadcasterIceCandidate = useCallback((candidate: RTCIceCandidate) => {
        setBroadcasterIceCandidates(prev => [...prev, candidate]);
    }, []);

    const handleViewerIceCandidate = useCallback((candidate: RTCIceCandidate) => {
        setViewerIceCandidates(prev => [...prev, candidate]);
    }, []);

    const handleReset = useCallback(() => {
        setOffer(null);
        setAnswer(null);
        setBroadcasterIceCandidates([]);
        setViewerIceCandidates([]);
        setIsStreaming(false);
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">LAN Video Streamer</h1>
                    <p className="mt-4 text-lg text-indigo-300">Peer-to-peer webcam streaming using WebRTC</p>
                    <p className="mt-2 text-sm text-gray-400">Open this page in two separate browser windows on the same network to test.</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Broadcaster
                        onOfferCreated={handleOfferCreated}
                        onIceCandidate={handleBroadcasterIceCandidate}
                        answer={answer}
                        viewerIceCandidates={viewerIceCandidates}
                        onStreamingStateChange={setIsStreaming}
                        onReset={handleReset}
                    />
                    <Viewer
                        offer={offer}
                        onAnswerCreated={handleAnswerCreated}
                        onIceCandidate={handleViewerIceCandidate}
                        broadcasterIceCandidates={broadcasterIceCandidates}
                        isStreaming={isStreaming}
                    />
                </main>

                <footer className="text-center mt-16 text-gray-500 text-sm">
                    <p>Powered by React, TypeScript, Tailwind CSS, and WebRTC.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;
