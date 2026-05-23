/*
Copyright The Kubernetes Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import React, { type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class RouteErrorBoundary extends React.Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Node readiness plugin:', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert
            action={
              <Button color="inherit" size="small" onClick={() => this.setState({ error: null })}>
                Retry
              </Button>
            }
            severity="error"
          >
            <Typography variant="body2">{this.state.error.message}</Typography>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}
