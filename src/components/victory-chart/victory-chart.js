import { defaults } from "lodash";
import React, { PropTypes } from "react";
import {
  PropTypes as CustomPropTypes, Helpers, VictorySharedEvents, VictoryContainer,
  VictoryTheme, Scale
} from "victory-core";
import VictoryAxis from "../victory-axis/victory-axis";
import ChartHelpers from "./helper-methods";
import Axis from "../../helpers/axis";
import Wrapper from "../../helpers/wrapper";

const fallbackProps = {
  width: 450,
  height: 300,
  padding: 50
};

export default class VictoryChart extends React.Component {
  static displayName = "VictoryChart";

  static propTypes = {
    animate: PropTypes.object,
    children: React.PropTypes.oneOfType([
      React.PropTypes.arrayOf(React.PropTypes.node),
      React.PropTypes.node
    ]),
    containerComponent: PropTypes.element,
    defaultAxes: PropTypes.shape({
      independent: PropTypes.element,
      dependent: PropTypes.element
    }),
    domain: PropTypes.oneOfType([
      CustomPropTypes.domain,
      PropTypes.shape({
        x: CustomPropTypes.domain,
        y: CustomPropTypes.domain
      })
    ]),
    domainPadding: PropTypes.oneOfType([
      PropTypes.shape({
        x: PropTypes.oneOfType([ PropTypes.number, CustomPropTypes.domain ]),
        y: PropTypes.oneOfType([ PropTypes.number, CustomPropTypes.domain ])
      }),
      PropTypes.number
    ]),
    events: PropTypes.arrayOf(PropTypes.shape({
      childName: PropTypes.oneOfType([ PropTypes.string, PropTypes.array ]),
      target: PropTypes.string,
      eventKey: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.func,
        CustomPropTypes.allOfType([CustomPropTypes.integer, CustomPropTypes.nonNegative]),
        PropTypes.string
      ]),
      eventHandlers: PropTypes.object
    })),
    eventKey: PropTypes.oneOfType([
      PropTypes.func,
      CustomPropTypes.allOfType([CustomPropTypes.integer, CustomPropTypes.nonNegative]),
      PropTypes.string
    ]),
    groupComponent: PropTypes.element,
    height: CustomPropTypes.nonNegative,
    padding: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.shape({
        top: PropTypes.number, bottom: PropTypes.number,
        left: PropTypes.number, right: PropTypes.number
      })
    ]),
    scale: PropTypes.oneOfType([
      CustomPropTypes.scale,
      PropTypes.shape({ x: CustomPropTypes.scale, y: CustomPropTypes.scale })
    ]),
    standalone: PropTypes.bool,
    style: PropTypes.object,
    theme: PropTypes.object,
    width: CustomPropTypes.nonNegative
  };

  static defaultProps = {
    standalone: true,
    containerComponent: <VictoryContainer/>,
    groupComponent: <g/>,
    theme: VictoryTheme.grayscale,
    defaultAxes: {
      independent: <VictoryAxis/>,
      dependent: <VictoryAxis dependentAxis/>
    }
  };

  constructor(props) {
    super(props);
    if (props.animate) {
      this.state = {
        nodesShouldLoad: false,
        nodesDoneLoad: false,
        animating: true
      };
      this.setAnimationState = Wrapper.setAnimationState.bind(this);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.animate) {
      this.setAnimationState(this.props, nextProps);
    }
  }

  getStyles(props) {
    const styleProps = props.style && props.style.parent;
    return {
      parent: defaults({
        height: "auto",
        width: "100%"
      },
      styleProps
    )};
  }

  getAxisProps(child, props, calculatedProps) {
    const { domain, scale, originSign } = calculatedProps;
    const axis = child.type.getAxis(child.props);
    const axisOffset = ChartHelpers.getAxisOffset(props, calculatedProps);
    const tickValues = ChartHelpers.getTicks(calculatedProps, axis, child);
    const tickFormat =
      child.props.tickFormat || ChartHelpers.getTickFormat(child, axis, calculatedProps);
    const offsetY = axis === "y" ? undefined : axisOffset.y;
    const offsetX = axis === "x" ? undefined : axisOffset.x;
    const crossAxis = child.props.crossAxis === false ? false : true;
    const orientation = Axis.getOrientation(child, axis, originSign[axis]);
    return {
      domain: domain[axis],
      scale: scale[axis],
      tickValues,
      tickFormat,
      offsetY: child.props.offsetY || offsetY,
      offsetX: child.props.offsetX || offsetX,
      crossAxis,
      orientation
    };
  }

  getChildProps(child, props, calculatedProps) {
    const axisChild = Axis.findAxisComponents([child]);
    if (axisChild.length > 0) {
      return this.getAxisProps(axisChild[0], props, calculatedProps);
    }
    return {
      domain: calculatedProps.domain,
      scale: calculatedProps.scale,
      categories: calculatedProps.categories
    };
  }

  getCalculatedProps(props, childComponents) {
    const style = this.getStyles(props);
    const horizontal = childComponents.some((component) => component.props.horizontal);
    const axisComponents = {
      x: Axis.getAxisComponent(childComponents, "x"),
      y: Axis.getAxisComponent(childComponents, "y")
    };
    const domain = {
      x: ChartHelpers.getDomain(props, "x", childComponents),
      y: ChartHelpers.getDomain(props, "y", childComponents)
    };
    const range = {
      x: Helpers.getRange(props, "x"),
      y: Helpers.getRange(props, "y")
    };
    const baseScale = {
      x: Scale.getScaleFromProps(props, "x") ||
        axisComponents.x && axisComponents.x.type.getScale(axisComponents.x.props) ||
        Scale.getDefaultScale(),
      y: Scale.getScaleFromProps(props, "y") ||
        axisComponents.y && axisComponents.y.type.getScale(axisComponents.y.props) ||
        Scale.getDefaultScale()
    };
    const scale = {
      x: baseScale.x.domain(domain.x).range(range.x),
      y: baseScale.y.domain(domain.y).range(range.y)
    };

    const origin = {
      x: Axis.getOrigin(domain.x),
      y: Axis.getOrigin(domain.y)
    };

    const originSign = {
      x: Axis.getOriginSign(origin.x, domain.x),
      y: Axis.getOriginSign(origin.y, domain.y)
    };

    // TODO: check
    const categories = {
      x: Wrapper.getCategories(props, "x", childComponents),
      y: Wrapper.getCategories(props, "y", childComponents)
    };

    const stringMap = {
      x: ChartHelpers.createStringMap(props, "x", childComponents),
      y: ChartHelpers.createStringMap(props, "y", childComponents)
    };

    const defaultDomainPadding = ChartHelpers.getDefaultDomainPadding(childComponents, horizontal);

    return {
      axisComponents, categories, domain, horizontal, scale, stringMap,
      style, origin, originSign, defaultDomainPadding
    };
  }

  getNewChildren(props, childComponents, calculatedProps) {
    const baseStyle = calculatedProps.style.parent;
    const getAnimationProps = Wrapper.getAnimationProps.bind(this);
    const newChildren = [];
    for (let index = 0, len = childComponents.length; index < len; index++) {
      const child = childComponents[index];
      const style = defaults({}, child.props.style, {parent: baseStyle});
      const childProps = this.getChildProps(child, props, calculatedProps);
      const newProps = defaults({
        animate: getAnimationProps(props, child, index),
        height: props.height,
        width: props.width,
        clipWidth: props.width,
        clipHeight: props.height,
        domainPadding: child.props.domainPadding ||
          props.domainPadding || calculatedProps.defaultDomainPadding,
        padding: Helpers.getPadding(props),
        ref: index,
        key: index,
        theme: props.theme,
        standalone: false,
        style
      }, childProps);
      newChildren[index] = React.cloneElement(child, newProps);
    }
    return newChildren;
  }

  getContainer(props, calculatedProps) {
    const { width, height, containerComponent } = props;
    const { scale, style } = calculatedProps;
    const parentProps = defaults(
      {},
      containerComponent.props,
      {style: style.parent, scale, width, height}
    );
    return React.cloneElement(containerComponent, parentProps);
  }

  renderGroup(children, style) {
    return React.cloneElement(
      this.props.groupComponent,
      { role: "presentation", style},
      children
    );
  }

  render() {
    const props = this.state && this.state.nodesWillExit ?
      this.state.oldProps : this.props;
    const modifiedProps = Helpers.modifyProps(props, fallbackProps, "chart");
    const childComponents = ChartHelpers.getChildComponents(modifiedProps,
      modifiedProps.defaultAxes);
    const calculatedProps = this.getCalculatedProps(modifiedProps, childComponents);
    const container = modifiedProps.standalone && this.getContainer(modifiedProps, calculatedProps);
    const newChildren = this.getNewChildren(modifiedProps, childComponents, calculatedProps);
    if (modifiedProps.events) {
      return (
        <VictorySharedEvents events={modifiedProps.events}
          eventKey={modifiedProps.eventKey}
          container={container}
        >
          {newChildren}
        </VictorySharedEvents>
      );
    }

    const group = this.renderGroup(newChildren, calculatedProps.style.parent);
    return modifiedProps.standalone ? React.cloneElement(container, container.props, group) : group;
  }
}
