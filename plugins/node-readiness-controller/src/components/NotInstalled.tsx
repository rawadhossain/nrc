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

export function NotInstalled({
  isLoading,
  onRecheck,
}: {
  isLoading: boolean;
  onRecheck: () => void;
}) {
  return (
    <Box sx={{ maxWidth: 560 }}>
      <Alert severity="info" variant="outlined">
        <Typography gutterBottom variant="body2">
          The <strong>readiness.node.x-k8s.io</strong> API was not detected on this cluster (install CRDs and the Node
          Readiness controller, or switch context).
        </Typography>
        <Button disabled={isLoading} size="small" variant="outlined" onClick={onRecheck}>
          Check again
        </Button>
      </Alert>
    </Box>
  );
}
