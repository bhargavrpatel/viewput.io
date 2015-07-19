<hello-world>
  <h1>Hello, { opts.name }!</h1>
  <ul>
    <li each = { opts.files }>
      <strong if = { toBold }>{ name }</strong>
    </li>
  </ul>
</hello-world>
