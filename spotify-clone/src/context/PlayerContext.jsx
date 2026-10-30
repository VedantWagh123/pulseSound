import { createContext, useEffect, useRef, useState } from "react";
import { songsData as localSongsData, albumsData as localAlbumsData } from "../assets/assets";
import axios from 'axios'

export const PlayerContext = createContext();

const PlayerContextProvider = (props) => {

    const audioRef = useRef();
    const seekBg = useRef();
    const seekBar = useRef();
    const url = 'http://localhost:4000'

    // Format local dummy data so both _id and id work, and each song has an assigned album
    const formattedLocalAlbums = localAlbumsData.map((item) => ({
        ...item,
        _id: String(item.id),
        bgColour: item.bgColor || item.bgColour || "#121212"
    }));

    const formattedLocalSongs = localSongsData.map((item, index) => ({
        ...item,
        _id: String(item.id),
        album: formattedLocalAlbums[index % formattedLocalAlbums.length]?.name || "Top 50 Global"
    }));

    const [songsData, setSongsData] = useState(formattedLocalSongs);
    const [albumsData, setAlbumData] = useState(formattedLocalAlbums);
    const [track, setTrack] = useState(formattedLocalSongs[0]);
    const [playStatus, setPlayStatus] = useState(false);
    const [time, setTime] = useState({
        currentTime: {
            second: 0,
            minute: 0
        },
        totalTime: {
            second: 0,
            minute: 0
        }
    })

    const play = () => {
        if (audioRef.current) {
            audioRef.current.play();
            setPlayStatus(true);
        }
    }

    const pause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setPlayStatus(false);
        }
    }

    const playWithId = async (id) => {
        songsData.forEach((item) => {
            if (id === item._id || id === item.id || String(id) === String(item._id) || String(id) === String(item.id)) {
                setTrack(item);
            }
        });
        if (audioRef.current) {
            await audioRef.current.play();
            setPlayStatus(true);
        }
    }

    const previous = async () => {
        songsData.forEach(async (item, index) => {
            if ((track._id === item._id || track.id === item.id || String(track._id) === String(item._id)) && index > 0) {
                await setTrack(songsData[index - 1]);
                if (audioRef.current) {
                    await audioRef.current.play();
                    setPlayStatus(true);
                }
            }
        })
    }

    const next = async () => {
        songsData.forEach(async (item, index) => {
            if ((track._id === item._id || track.id === item.id || String(track._id) === String(item._id)) && index < songsData.length - 1) {
                await setTrack(songsData[index + 1]);
                if (audioRef.current) {
                    await audioRef.current.play();
                    setPlayStatus(true);
                }
            }
        })
    }

    const seekSong = async (e) => {
        if (audioRef.current && seekBg.current) {
            audioRef.current.currentTime = ((e.nativeEvent.offsetX / seekBg.current.offsetWidth) * audioRef.current.duration)
        }
    }

    const getSongsData = async () => {
        try {
            const response = await axios.get(`${url}/api/song/list`);
            if (response.data && response.data.songs && response.data.songs.length > 0) {
                setSongsData(response.data.songs);
                setTrack(response.data.songs[0]);
            }
        } catch (error) {
            console.log("Backend not connected or empty, running in local mode");
        }
    }

    const getAlbumsData = async () => {
        try {
            const response = await axios.get(`${url}/api/album/list`);
            if (response.data && response.data.albums && response.data.albums.length > 0) {
                setAlbumData(response.data.albums);
            }
        } catch (error) {
            console.log("Backend not connected or empty, running in local mode");
        }
    }

    useEffect(() => {
        setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.ontimeupdate = () => {
                    if (seekBar.current) {
                        seekBar.current.style.width = (Math.floor(audioRef.current.currentTime / audioRef.current.duration * 100)) + "%";
                    }
                    setTime({
                        currentTime: {
                            second: Math.floor(audioRef.current.currentTime % 60) || 0,
                            minute: Math.floor(audioRef.current.currentTime / 60) || 0
                        },
                        totalTime: {
                            second: Math.floor(audioRef.current.duration % 60) || 0,
                            minute: Math.floor(audioRef.current.duration / 60) || 0
                        }
                    })
                }
            }
        }, 1000);
    }, [audioRef])

    useEffect(() => { 
        getSongsData()
        getAlbumsData()
    }, [])

    const contextValue = {
        audioRef,
        seekBar,
        seekBg,
        track, setTrack,
        playStatus, setPlayStatus,
        time, setTime,
        play, pause,
        playWithId,
        previous, next,
        seekSong,
        songsData, albumsData
    }

    return (
        <PlayerContext.Provider value={contextValue}>
            {props.children}
        </PlayerContext.Provider>
    )

}

export default PlayerContextProvider;