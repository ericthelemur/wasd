import './song.scss';

import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { Textfit } from 'react-textfit';
import { useReplicant } from 'use-nodecg';

import { CurrentSong } from '../../../../../ncg-spotify/src/types/schemas';
import { AnimTextFit } from '../../../graphics/components/animtext';

export function CurrentSong() {
    const [song,] = useReplicant<CurrentSong>("currentSong", { name: "", artist: "", albumArt: "", playing: false }, { namespace: "ncg-spotify" })
    if (!song || !song.playing) return null;

    return <ReactCSSTransitionReplace key={song.name} transitionName="fade-wait" transitionEnterTimeout={1000} transitionLeaveTimeout={1000} className="song-outer">
        <div className="song">
            <div className="art">
                {song.albumArt && <img src={song.albumArt} />}
            </div>
            <Textfit mode="multi" max={26} style={{ fontSize: "26px" }} className="details">
                <div className="name">{song.name}</div>
                <div className="artist">{song.artist}</div>
            </Textfit>
        </div>
    </ReactCSSTransitionReplace>
}