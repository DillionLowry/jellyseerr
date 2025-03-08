import TvDetails from '@app/components/TvDetails';
import defineMessages from '@app/utils/defineMessages';
import { useIntl } from 'react-intl';
import type { TvDetails as TvDetailsType } from '@server/models/Tv';
import type { GetServerSideProps, NextPage } from 'next';
import Alert from '@app/components/Common/Alert';

const messages = defineMessages('pages', {
  tvcontentRestricted: 'Content Restricted',
  tvContentRestrictedDescription: 'This content is not available based on your content rating settings.',
});

interface TvPageProps {
  tv?: TvDetailsType;
  error?: {
    status: number;
    message: string;
    mediaInfo?: {
      title: string;
      type: 'movie' | 'tv';
      blocked: boolean;
    };
  };
}

const TvPage: NextPage<TvPageProps> = ({ tv, error }) => {
  const intl = useIntl();

  // Handle blocked content
  if (error?.status === 403 && error?.mediaInfo?.blocked) {
    return (
      <div className="page">
        <div className="container mx-auto">
          <Alert
            title={error.mediaInfo?.title ?? intl.formatMessage(messages.tvcontentRestricted)}
            type="error"
          >
            <div className="text-sm">
              <p className="mt-2">
                {intl.formatMessage(messages.tvContentRestrictedDescription)}
              </p>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return <TvDetails tv={tv} />;
};

export const getServerSideProps: GetServerSideProps<TvPageProps> = async (
  ctx
) => {
  const res = await fetch(
    `http://localhost:${process.env.PORT || 5055}/api/v1/tv/${ctx.query.tvId}`,
    {
      headers: ctx.req?.headers?.cookie
        ? { cookie: ctx.req.headers.cookie }
        : undefined,
    }
  );
  if (!res.ok) {
    if (res.status === 403) {
      const data = await res.json();
      return {
        props: {
          error: {
            status: res.status,
            message: data.message,
            mediaInfo: data.mediaInfo,
          },
        },
      };
    }
    throw new Error();
  }
  const tv: TvDetailsType = await res.json();

  return {
    props: {
      tv,
    },
  };
};

export default TvPage;
