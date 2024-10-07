import React, { createContext, useState, useContext } from 'react';

const InVoiceChannelContext = createContext();

export const InVoiceChannelProvider = ({ children }) => {
    const [inVoiceChannel, setInVoiceChannel] = useState({});

    return (
        <InVoiceChannelContext.Provider value={{ inVoiceChannel, setInVoiceChannel }}>
            {children}
        </InVoiceChannelContext.Provider>
    );
};

export const useInVoiceChannel = () => {
    const context = useContext(InVoiceChannelContext);
    if (context === undefined) {
        throw new Error('useInVoiceChannel must be used within a InVoiceChannelProvider');
    }
    return context;
};