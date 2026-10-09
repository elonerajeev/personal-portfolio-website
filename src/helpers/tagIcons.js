/**
 * Official logos for tool/service tags (keys are lower-case tag text).
 * Tags without an entry (soft skills, topics) keep the neutral icon.
 */
const T = (file) => `/images/tech/${file}`

const TAG_ICONS = {
    'aws': T('aws.svg'),
    'azure': T('azure.svg'),
    'kubernetes': T('kubernetes.svg'),
    'kubernetes (eks)': T('aws-eks.svg'),
    'ecs': T('aws-ecs.svg'),
    'lambda': T('aws-lambda.svg'),
    'codepipeline': T('aws-codepipeline.svg'),
    'cloudwatch': T('aws-cloudwatch.svg'),
    'load balancer': T('aws-elb.svg'),
    'security': T('aws-iam.svg'),
    'terraform': T('terraform.svg'),
    'docker': T('docker.svg'),
    'containerization': T('docker.svg'),
    'jenkins': T('jenkins.svg'),
    'github actions': T('github-actions.svg'),
    'ci/cd': T('github-actions.svg'),
    'linux': T('linux.svg'),
    'prometheus': T('prometheus.svg'),
    'grafana': T('grafana.svg'),
    'monitoring': T('prometheus.svg'),
    'version control': T('git.svg'),
    'mern': T('mongodb-icon.svg'),
    'multi-cloud': T('project-multi-cloud.svg'),
    'cloud': T('cloud.svg'),
    'cloud computing': T('cloud.svg'),
    'cloud deployment': T('cloud.svg'),
    'agile': T('process.svg'),
}

export const getTagIcon = (tag) => TAG_ICONS[String(tag || '').trim().toLowerCase()] || null
