#!/usr/bin/env python3
"""Add show/hide password eye toggle to Login."""
from pathlib import Path

path = Path('components/Login.tsx')
text = path.read_text()

if 'showPassword' not in text:
    text = text.replace(
        "  const [loading, setLoading] = useState(false);",
        "  const [loading, setLoading] = useState(false);\n  const [showPassword, setShowPassword] = useState(false);",
        1,
    )

old_pw = '''          <div className="login-input-group">
            <label htmlFor="login-password" className="login-input-label">Contraseña</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="current-password"
              spellCheck={false}
              required
            />
          </div>'''

new_pw = '''          <div className="login-input-group">
            <label htmlFor="login-password" className="login-input-label">Contraseña</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="current-password"
                spellCheck={false}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>'''

if old_pw not in text:
    if 'login-password-wrap' in text:
        print('Login already patched')
    else:
        raise SystemExit('password block not found in Login.tsx')
else:
    text = text.replace(old_pw, new_pw, 1)
    path.write_text(text)
    print('Login.tsx patched OK')

css = Path('components/Login.css')
css_text = css.read_text()
marker = '/* PASSWORD SHOW/HIDE TOGGLE */'
if marker not in css_text:
    css_text += '''

/* PASSWORD SHOW/HIDE TOGGLE */
.login-password-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.login-password-wrap input {
  width: 100%;
  padding-right: 3rem !important;
}

.login-password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.15rem;
  line-height: 1;
  padding: 0.35rem;
  border-radius: 0.5rem;
  color: rgba(248, 250, 252, 0.9);
  z-index: 2;
}

.login-password-toggle:hover {
  background: rgba(255, 255, 255, 0.12);
}

.login-password-toggle:focus-visible {
  outline: 2px solid rgba(102, 126, 234, 0.8);
  outline-offset: 2px;
}
'''
    css.write_text(css_text)
    print('Login.css patched OK')
else:
    print('Login.css already patched')
