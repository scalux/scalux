import React from "react";
import { connect } from "react-redux";

export const mkConditional =
  <State>() =>
  <OwnProps = {}>(
    selector: (
      state: State,
      ownProps?: OwnProps
    ) => React.ReactNode | undefined,
    fallBack: React.ReactNode = null
  ): React.ComponentType<OwnProps> => {
    const mapStateToProps = (state: State, ownProps: OwnProps) => ({
      node: selector(state, ownProps),
    });
    type ReduxProps = ReturnType<typeof mapStateToProps>;

    const Inner: React.FC<ReduxProps & OwnProps> = ({ node }) => {
      return node !== undefined ? node : fallBack;
    };

    const connector = connect(mapStateToProps);

    return connector(Inner as any) as React.ComponentType<OwnProps>;
  };
