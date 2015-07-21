import request from "superagent";
import React from "react";
import PartList from "./part-list";

export default class AllParts extends React.Component {
  constructor() {
    super();
    this.componentDidMount = this.componentDidMount.bind(this);
    this.render = this.render.bind(this);
    this.state = {
      parts: null
    };
    this.partIndexRequest = null;
  }

  componentDidMount() {
    this.partIndexRequest =
      request.get("/partIndex/by/id.json")
             .end(function(err, res){
               this.partIndexRequest = null;
               if (!err && res.ok) {
                  this.setState({
                    parts: JSON.parse(res.text)
                  });
              }
            }.bind(this));
  }

  componentWillUnmount() {
    if (this.partIndexRequest) {
      this.partIndexRequest.abort();
      this.partIndexRequest = null;
    }
  }

  render() {
    if (this.state.parts) {
      return <PartList parts={this.state.parts}/>;
    }
    return <div/>;
  }
}
