import './song.scss';

import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { Textfit } from 'react-textfit';
import { useReplicant } from 'use-nodecg';

import { CurrentSong as SongType } from '../../../../types/currentSong';
import { MusicData } from 'types/schemas';

export function CurrentSong() {
    const [song,] = useReplicant<MusicData>("musicData", { connected: true, playing: false }, { namespace: "music" });
    const track = song?.track;
    if (!song || !song.connected || !song.playing || !track) return <div></div>;

    return <div className="song-outer card">
        <ReactCSSTransitionReplace transitionName="fade-wait" transitionEnterTimeout={1000} transitionLeaveTimeout={1000} className="w-100">
            <div key={track.title} className="song fw-semibold">
                <div className="art">
                    {track.artwork && <img src={track.artwork} />}
                </div>
                <Textfit mode="multi" max={32} className="details">
                    <div className="name line-clamp-2">{track.title}</div>
                    <div className="artist line-clamp-2">{track.artist}</div>
                </Textfit>
            </div>
        </ReactCSSTransitionReplace>
    </div>
}