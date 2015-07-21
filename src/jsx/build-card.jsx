import React from "react";

import Col from "react-bootstrap/lib/Col";
import Panel from "react-bootstrap/lib/Panel";
import Row from "react-bootstrap/lib/Row";

export default class BuildCard extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
  }

  render() {
    var header = <h1><a href={ "/build/" + this.props.id}>{this.props.id}</a></h1>;
    return (
        <Panel className="build-card" header={header}>
          <Row className="row-eq-height" fill>
            <Col xs={8}>
              <div className='embed-responsive embed-responsive-16by9'><iframe className='embed-responsive-item' src={ "https://www.youtube.com/embed/" + this.props.flightInfo.hd.url + "?controls=0&rel=0&showinfo=0&start=" + this.props.flightInfo.hd.arm_time}/></div>
            </Col>
            <Col xs={4}>
              <div className='embed-responsive embed-responsive-16by9'><iframe className='embed-responsive-item' src={ "https://www.youtube.com/embed/" + this.props.flightInfo.flight.url + "?controls=0&rel=0&showinfo=0&start=" + this.props.flightInfo.flight.arm_time}/></div>
              <div className='blackbox'></div>
            </Col>
          </Row>
        </Panel>
      );
    }
}
BuildCard.propTypes = {
  flightInfo: React.PropTypes.object,
  id: React.PropTypes.string
};
