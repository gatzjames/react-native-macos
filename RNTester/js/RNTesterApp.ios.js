/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

const RNTesterActions = require('./utils/RNTesterActions');
const RNTesterExampleContainer = require('./components/RNTesterExampleContainer');
const RNTesterExampleList = require('./components/RNTesterExampleList');
const RNTesterList = require('./utils/RNTesterList.ios');
const RNTesterNavigationReducer = require('./utils/RNTesterNavigationReducer');
const React = require('react');
const SnapshotViewIOS = require('./examples/Snapshot/SnapshotViewIOS.ios');
const URIActionMap = require('./utils/URIActionMap');

const {
  AppRegistry,
  AsyncStorage,
  BackHandler,
  Button,
  Linking,
  NativeModules, // TODO(OSS Candidate ISS#2710739)
  Platform, // TODO(OSS Candidate ISS#2710739)
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  YellowBox,
} = require('react-native');

const {TestModule} = NativeModules; // TODO(OSS Candidate ISS#2710739)
const requestAnimationFrame = require('fbjs/lib/requestAnimationFrame'); // TODO(OSS Candidate ISS#2710739)

import type {RNTesterExample} from './types/RNTesterTypes';
import type {RNTesterAction} from './utils/RNTesterActions';
import type {RNTesterNavigationState} from './utils/RNTesterNavigationReducer';

type Props = {
  exampleFromAppetizeParams?: ?string,
};

YellowBox.ignoreWarnings([
  'Module RCTImagePickerManager requires main queue setup',
]);

const APP_STATE_KEY = 'RNTesterAppState.v2';

const Header = ({onBack, title}: {onBack?: () => mixed, title: string}) => (
  <SafeAreaView style={styles.headerContainer}>
    <View style={styles.header}>
      <View style={styles.headerCenter}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {onBack && (
        <View style={styles.headerLeft}>
          <Button title="Back" onPress={onBack} />
        </View>
      )}
    </View>
  </SafeAreaView>
);

class RNTesterApp extends React.Component<Props, RNTesterNavigationState> {
  _mounted: boolean;

  UNSAFE_componentWillMount() {
    BackHandler.addEventListener('hardwareBackPress', this._handleBack);
  }

  componentDidMount() {
    this._mounted = true;
    Linking.getInitialURL().then(url => {
      AsyncStorage.getItem(APP_STATE_KEY, (err, storedString) => {
        if (!this._mounted) {
          return;
        }
        const exampleAction = URIActionMap(
          this.props.exampleFromAppetizeParams,
        );
        const urlAction = URIActionMap(url);
        const launchAction = exampleAction || urlAction;
        const initialAction = launchAction || {type: 'InitialAction'};
        this.setState(RNTesterNavigationReducer(undefined, initialAction));
      });
    });

    Linking.addEventListener('url', url => {
      this._handleAction(URIActionMap(url));
    });
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  _handleBack = () => {
    this._handleAction(RNTesterActions.Back());
  };

  _handleAction = (action: ?RNTesterAction) => {
    if (!action) {
      return;
    }
    const newState = RNTesterNavigationReducer(this.state, action);
    if (this.state !== newState) {
      this.setState(newState, () =>
        AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(this.state)),
      );
    }
  };

  render(): React.Node | null {
    if (!this.state) {
      return null;
    }
    if (this.state.openExample) {
      const Component = RNTesterList.Modules[this.state.openExample];
      if (Component && Component.external) {
        return <Component onExampleExit={this._handleBack} />;
      } else {
        return (
          <View style={styles.exampleContainer}>
            <Header onBack={this._handleBack} title={Component.title} />
            <RNTesterExampleContainer module={Component} />
          </View>
        );
      }
    }
    return (
      <View style={styles.exampleContainer}>
        <Header title="RNTester" />
        <RNTesterExampleList
          onNavigate={this._handleAction}
          list={RNTesterList}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: {semantic: 'separatorColor'}, // TODO(OSS Candidate ISS#2710739)
    ...Platform.select({
      // [TODO(macOS ISS#2323203)
      ios: {
        backgroundColor: {semantic: 'tertiarySystemBackgroundColor'},
      },
      macos: {
        backgroundColor: {semantic: 'windowBackgroundColor'},
      },
    }),
    // ]TODO(macOS ISS#2323203)
  },
  header: {
    height: 40,
    flexDirection: 'row',
  },
  headerLeft: {},
  headerCenter: {
    flex: 1,
    position: 'absolute',
    top: 7,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
    color: {dynamic: {light: 'black', dark: 'white'}}, // TODO(OSS Candidate ISS#2710739)
  },
  exampleContainer: {
    flex: 1,
  },
});

AppRegistry.registerComponent('SetPropertiesExampleApp', () =>
  require('./examples/SetPropertiesExample/SetPropertiesExampleApp'),
);
AppRegistry.registerComponent('RootViewSizeFlexibilityExampleApp', () =>
  require('./examples/RootViewSizeFlexibilityExample/RootViewSizeFlexibilityExampleApp'),
);
AppRegistry.registerComponent('RNTesterApp', () => RNTesterApp);

// Register suitable examples for snapshot tests
RNTesterList.ComponentExamples.concat(RNTesterList.APIExamples).forEach(
  (Example: RNTesterExample) => {
    const ExampleModule = Example.module;
    if (ExampleModule.displayName) {
      class Snapshotter extends React.Component<{}> {
        render() {
          return (
            <SnapshotViewIOS>
              <RNTesterExampleContainer module={ExampleModule} />
            </SnapshotViewIOS>
          );
        }
      }

      AppRegistry.registerComponent(
        ExampleModule.displayName,
        () => Snapshotter,
      );
    }

    // [TODO(OSS Candidate ISS#2710739)
    class LoadPageTest extends React.Component<{}> {
      componentDidMount() {
        requestAnimationFrame(() => {
          TestModule.markTestCompleted();
        });
      }

      render() {
        return <RNTesterExampleContainer module={ExampleModule} />;
      }
    }

    AppRegistry.registerComponent(
      'LoadPageTest_' + Example.key,
      () => LoadPageTest,
    );
    // ]TODO(OSS Candidate ISS#2710739)
  },
);

// [TODO(OSS Candidate ISS#2710739)
class EnumerateExamplePages extends React.Component<{}> {
  render() {
    RNTesterList.ComponentExamples.concat(RNTesterList.APIExamples).forEach(
      (Example: RNTesterExample) => {
        let skipTest = false;
        if ('skipTest' in Example) {
          const platforms = Example.skipTest;
          skipTest =
            platforms !== undefined &&
            (Platform.OS in platforms || 'default' in platforms);
        }
        if (!skipTest) {
          console.trace(Example.key);
        }
      },
    );
    TestModule.markTestCompleted();
    return <View />;
  }
}

AppRegistry.registerComponent(
  'EnumerateExamplePages',
  () => EnumerateExamplePages,
);
// ]TODO(OSS Candidate ISS#2710739)

module.exports = RNTesterApp;
