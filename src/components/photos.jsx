import React from "react";

import classNames from "classnames";

import Panel from "react-bootstrap/lib/Panel";

import BuildActions from "../actions/build-actions";

import ImgurThumb from "./imgur-thumb";
import LinkInput from "./link-input";
import More from "./more";

export default class Photos extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onDeleteClick = this.onDeleteClick.bind(this);
    this.onMoreClick = this.onMoreClick.bind(this);
    this.state = {"numShowing": 9,
                  "maybeDelete": -1};
  }

  static trackOutboundLink(url, redirect) {
    ga("send", "event", "photo", "click", url, {"hitCallback":
      function () {
        if (redirect) {
          document.location = url;
        }
      }
    });
  }

  onClick(url, event) {
    let redirect = !event.ctrlKey && !event.metaKey && event.nativeEvent.button === 0;
    Photos.trackOutboundLink(url, redirect);
    if (redirect) {
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        event.returnValue = !1;
      }
    }
  }

  onMoreClick() {
    this.setState({"numShowing": this.state.numShowing + 3});
  }

  onAddPhoto(matchGroups) {
    BuildActions.addPhoto({"imgur": {"imageId": matchGroups[0], "extension": matchGroups[1] || "jpg"}});
  }

  onDeleteClick(index) {
    if (index === this.state.maybeDelete) {
      this.setState({"maybeDelete": -1});
      BuildActions.deletePhoto(index);
    } else {
      this.setState({"maybeDelete": index});
    }
  }

  render() {
    if ((this.props.photos.length === 0 ||
         (this.props.photos.length === 1 &&
          this.props.photos[0].imgur.imageId === "")) && !this.props.editing) {
      return null;
    }
    let input = null;
    if (this.props.editing) {
      let invalidMessage = <div>Sorry only Imgur links are currently supported. They do free image hosting. <a href="https://imgur.com">Upload here.</a></div>;
      input = (<LinkInput buttonText="Add"
                          invalidMessage={invalidMessage}
                          label="Image Link"
                          onSubmit={this.onAddPhoto}
                          placeholder="Example: http://i.imgur.com/BAeIENx.jpg"
                          regexes={[new RegExp("(?:(?:https?)://)?(?:i\\.)?imgur\\.com/(\\w+)(?:\\.(\\w+))?")]}/>);
    }
    let more = null;
    let numShowing = this.state.numShowing;
    if (this.props.photos.length > numShowing) {
      more = <More onClick={this.onMoreClick}/>;
      numShowing--;
    }
    let photos = [];
    for (let i = this.props.photos.length - 1; i >= 0 && i >= this.props.photos.length - numShowing; i--) {
      let photo = this.props.photos[i].imgur;
      let url = "https://imgur.com/" + photo.imageId;
      if (!this.props.editing) {
        photos.push(<a className="photo-thumb" href={url} key={photo.imageId} onClick={this.onClick.bind(this, url)}><ImgurThumb aspectRatio="1by1" imageId={photo.imageId}/></a>);
      } else {
        let confirmDelete = null;
        if (i === this.state.maybeDelete) {
          confirmDelete = (<div className="delete">Click again to delete.</div>);
        }
        let classes = classNames("photo-thumb", {"maybe-delete": confirmDelete !== null});
        photos.push(<ImgurThumb aspectRatio="1by1" className={classes} imageId={photo.imageId} key={photo.imageId} onClick={this.onDeleteClick.bind(this, i)}>
          {confirmDelete}</ImgurThumb>);
      }
    }
    if (this.props.photos.length === 1 &&
        this.props.photos[0].imgur.imageId === "") {
       photos = [];
    }
    return (<Panel className="build-photos" header="Photos"><div fill id="photo-container">{input}{photos}{more}</div></Panel>);
  }
}
Photos.propTypes = {
  editing: React.PropTypes.bool.isRequired,
  photos: React.PropTypes.array
};
