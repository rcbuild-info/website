import React from "react";

import Jumbotron from "react-bootstrap/lib/Jumbotron";

import ButtonLink from "react-router-bootstrap/lib/ButtonLink";

export default class HomePage extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
  }

  render() {
    return (<Jumbotron>
              <h1>Welcome!</h1>
              <p>Find a build and PIDs to make the best flying multirotor you've ever had. Or, create your build and PIDs you already have to compare to similar setups.</p>
              <p>
                <ButtonLink bsStyle="primary" params={{"page": 1}} to="builds">Find Build</ButtonLink>
                &nbsp;
                <ButtonLink bsStyle="primary" to="createbuild">Create Build</ButtonLink>
              </p>
            </Jumbotron>);
  }
}
