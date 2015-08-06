import React from "react";

import Jumbotron from "react-bootstrap/lib/Jumbotron";
import Button from "react-bootstrap/lib/Button";

export default class HomePage extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
  }

  render() {
    return (<Jumbotron>
              <h1>Welcome!</h1>
              <p>Find a build and PIDs to make the best flying multirotor you've ever had. Or, share a build and PIDs you already have to get feedback easily.</p>
              <p><Button bsStyle="primary" href="/builds">Find Build</Button> <Button bsStyle="primary" href="/createbuild">Share Build</Button></p>
            </Jumbotron>);
  }
}
