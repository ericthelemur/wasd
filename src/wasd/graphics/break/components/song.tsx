import './song.scss';

import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { Textfit } from 'react-textfit';
import { useReplicant } from 'use-nodecg';

import { CurrentSong as SongType } from '../../../../types/currentSong';

export function CurrentSong() {
    const [song,] = useReplicant<SongType>("currentSong", { name: "", artist: "", albumArt: "", playing: false, connected: false }, { namespace: "ncg-spotify" })
    if (!song || !song.connected || !song.playing) return <div></div>;

    return <div className="song-outer card">
        <ReactCSSTransitionReplace transitionName="fade-wait" transitionEnterTimeout={1000} transitionLeaveTimeout={1000} className="w-100">
            <div key={song.name} className="song fw-semibold">
                <div className="art">
                    {song.albumArt && <img src={song.albumArt} />}
                </div>
                <Textfit mode="multi" max={26} style={{ fontSize: "26px" }} className="details">
                    <div className="name line-clamp-2">{song.name}</div>
                    <div className="artist line-clamp-2">{song.artist}</div>
                </Textfit>
            </div>
        </ReactCSSTransitionReplace>
    </div>
}