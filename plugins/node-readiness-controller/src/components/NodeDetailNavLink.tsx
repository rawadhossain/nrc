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

import MuiLink from '@mui/material/Link';
import type { ReactNode } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { PLUGIN_ROOT } from '../pluginRoutes';

/** Cluster base path: `/clusters/...` segment before the plugin root. */
function clusterBaseFromPathname(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  const marker = `${PLUGIN_ROOT}/`;
  const idx = normalized.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  return normalized.slice(0, idx);
}

export function NodeDetailNavLink({ nodeName, children }: { nodeName: string; children: ReactNode }) {
  const history = useHistory();
  const { pathname } = useLocation();
  const base = clusterBaseFromPathname(pathname);

  if (!base) {
    return <span>{children}</span>;
  }

  const href = `${base}/nodes/${encodeURIComponent(nodeName)}`;

  return (
    <MuiLink
      component="button"
      type="button"
      underline="hover"
      onClick={() => history.push(href)}
      sx={{
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        padding: 0,
        font: 'inherit',
        textAlign: 'inherit',
        verticalAlign: 'inherit',
      }}
    >
      {children}
    </MuiLink>
  );
}
