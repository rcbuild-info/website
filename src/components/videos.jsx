import React from "react";

import classNames from "classnames";

import YouTube from "react-youtube";

import Panel from "react-bootstrap/lib/Panel";

import BuildActions from "../actions/build-actions";

import YouTubeThumb from "./youtube-thumb";
import LinkInput from "./link-input";
import More from "./more";

export default class Videos extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onClickVideo = this.onClickVideo.bind(this);
    this.onAddVideo = this.onAddVideo.bind(this);
    this.onDeleteVideo = this.onDeleteVideo.bind(this);
    this.state = {
      "activeVideo": -1,
      "maybeDelete": -1
    };
  }

  static trackVideo(action, videoId) {
    ga("send", "event", "photo", action, videoId);
  }

  onClickVideo(index) {
    if (index === this.state.activeVideo) {
      Videos.trackVideo("swapOut", "youtube." + this.props.videos[index].youtube.videoId);
      this.setState({"activeVideo": -1});
    } else {
      Videos.trackVideo("swapIn", "youtube." + this.props.videos[index].youtube.videoId);
      this.setState({"activeVideo": index});
    }
  }

  onAddVideo(matchGroups) {
    BuildActions.addVideo({"youtube": {"videoId": matchGroups[0]}});
  }

  onDeleteVideo(index) {
    if (index === this.state.maybeDelete) {
      this.setState({"maybeDelete": -1});
      BuildActions.deleteVideo(index);
    } else {
      this.setState({"maybeDelete": index});
    }
  }

  render() {
    if ((this.props.videos.length === 0 ||
         (this.props.videos.length === 1 &&
          this.props.videos[0].youtube.videoId === "")) && !this.props.editing) {
      return null;
    }
    let input = null;
    if (this.props.editing) {
      let invalidMessage = <div>Sorry, only YouTube links are currently supported. <a href="https://youtube.com">Upload here.</a></div>;
      input = (<LinkInput buttonText="Add"
                          invalidMessage={invalidMessage}
                          label="Video Link"
                          onSubmit={this.onAddVideo}
                          placeholder="Example: https://youtu.be/4sh4J0uojMg"
                          regexes={[new RegExp("youtu\\.be/([\\w-]+)"),
                                    new RegExp("youtube\\.com/watch.*(?:&|\\?)v=([\\w-]+)")]}/>);
    }
    let videos = this.props.videos;
    let largeVideo = null;
    if (this.state.activeVideo !== -1) {
      largeVideo = videos[this.state.activeVideo].youtube.videoId;
    } else if (videos.length > 0) {
      largeVideo = videos[videos.length - 1].youtube.videoId;
    }
    let player = "";
    if (largeVideo) {
      if (!this.props.editing) {
        player = (<div className="embed-responsive embed-responsive-16by9">
                    <YouTube onEnd={ Videos.trackVideo.bind(null, "end", "youtube." + largeVideo)}
                             onPause={ Videos.trackVideo.bind(null, "pause", "youtube." + largeVideo)}
                             onPlay={ Videos.trackVideo.bind(null, "play", "youtube." + largeVideo)}
                             url={"http://www.youtube.com/watch?v=" + largeVideo}/></div>);
      } else {
        let confirmDelete = null;
        if (videos.length - 1 === this.state.maybeDelete) {
          confirmDelete = (<div className="delete">Click again to delete.</div>);
        }
        let classes = classNames({"maybe-delete": confirmDelete !== null});
        player = (<YouTubeThumb className={classes} key={largeVideo} onClick={ this.onDeleteVideo.bind(this, videos.length - 1)} videoId={largeVideo}>{confirmDelete}</YouTubeThumb>);
      }
    }
    let smallVideos = [];
    if (videos.length > 1) {
      for (let i = videos.length - 2; i >= 0 && i >= videos.length - 4; i--) {
        let videoId = videos[i].youtube.videoId;
        let callback = this.onClickVideo;
        if (this.props.editing) {
          callback = this.onDeleteVideo;
        }
        let confirmDelete = null;
        if (i === this.state.maybeDelete) {
          confirmDelete = (<div className="delete">Click again to delete.</div>);
        }
        let classes = classNames({"small-video": true,
                                  "not-active": this.state.activeVideo !== -1 && this.state.activeVideo !== i,
                                  "maybe-delete": confirmDelete !== null});
        smallVideos.push(<YouTubeThumb className={classes} key={videoId} onClick={ callback.bind(this, i)} videoId={videoId}>{confirmDelete}</YouTubeThumb>);
      }
    }
    return (<Panel className="build-videos" header="Videos">
              <div fill>
                {input}
                <div className="large-video">
                  {player}
                </div>
                <div>
                  {smallVideos}
                </div>
              </div>
            </Panel>);
  }
}
Videos.propTypes = {
  editing: React.PropTypes.bool.isRequired,
  videos: React.PropTypes.array
};
